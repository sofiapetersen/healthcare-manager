import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Doctor, Patient } from '@/types';
import { toast } from 'sonner';

interface CreateAppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAppointmentForm = ({ open, onOpenChange }: CreateAppointmentFormProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [complaint, setComplaint] = useState('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    age: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDoctors();
      fetchPatients();
    }
  }, [open]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('first_name');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const checkTimeConflict = async (doctorId: string, appointmentDate: string, appointmentTime: string): Promise<boolean> => {
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate)
      .in('status', ['scheduled', 'in_consultation']);

    if (error) throw error;

    if (!existingAppointments || existingAppointments.length === 0) return false;

    // Convert time string to minutes for easier comparison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const newTimeInMinutes = timeToMinutes(appointmentTime);

    for (const apt of existingAppointments) {
      const existingTimeInMinutes = timeToMinutes(apt.appointment_time);
      const timeDifference = Math.abs(newTimeInMinutes - existingTimeInMinutes);

      // Check if same time or less than 30 minutes apart
      if (timeDifference < 30) {
        return true;
      }
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctor || !date || !time || !complaint) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      let patientId = selectedPatient;

      // Create new patient if needed
      if (isNewPatient) {
        if (!newPatientData.first_name || !newPatientData.phone) {
          toast.error('Please fill in patient name and phone');
          setIsSubmitting(false);
          return;
        }

        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert([{
            first_name: newPatientData.first_name,
            last_name: newPatientData.last_name,
            phone: newPatientData.phone,
            age: newPatientData.age ? parseInt(newPatientData.age) : null,
          }])
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      if (!patientId) {
        toast.error('Please select a patient');
        setIsSubmitting(false);
        return;
      }

      const appointmentDate = format(date, 'yyyy-MM-dd');

      // Check for time conflicts
      const hasConflict = await checkTimeConflict(selectedDoctor, appointmentDate, time);
      if (hasConflict) {
        toast.error('Time conflict: This doctor already has an appointment within 30 minutes of this time');
        setIsSubmitting(false);
        return;
      }

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientId,
          doctor_id: selectedDoctor,
          appointment_date: appointmentDate,
          appointment_time: time,
          complaint,
          status: 'scheduled',
        }]);

      if (appointmentError) throw appointmentError;

      toast.success('Appointment created successfully');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedDoctor('');
    setSelectedPatient('');
    setDate(undefined);
    setTime('');
    setComplaint('');
    setIsNewPatient(false);
    setNewPatientData({ first_name: '', last_name: '', phone: '', age: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Appointment</DialogTitle>
          <DialogDescription>
            Fill in the details to schedule a new patient appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label>Patient</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewPatient(!isNewPatient)}
              >
                {isNewPatient ? 'Select Existing' : 'Create New Patient'}
              </Button>
            </div>

            {isNewPatient ? (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newPatientData.first_name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newPatientData.last_name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={newPatientData.age}
                    onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor *</Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor} required>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name} {doctor.specialty && `- ${doctor.specialty}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Appointment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">Appointment Time *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          {/* Complaint */}
          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint *</Label>
            <Textarea
              id="complaint"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Enter patient's chief complaint..."
              rows={4}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
