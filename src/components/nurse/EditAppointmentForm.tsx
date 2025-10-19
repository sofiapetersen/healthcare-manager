import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Doctor, AppointmentStatus } from '@/types';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface EditAppointmentFormProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditAppointmentForm = ({ appointment, open, onOpenChange }: EditAppointmentFormProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      fetchDoctors();
      setSelectedDoctor(appointment.doctor_id);
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = appointment.appointment_date.split('-').map(Number);
      setDate(new Date(year, month - 1, day));
      setTime(appointment.appointment_time);
      setStatus(appointment.status);
    }
  }, [open, appointment]);

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

  const checkTimeConflict = async (doctorId: string, appointmentDate: string, appointmentTime: string, currentAppointmentId: string): Promise<boolean> => {
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate)
      .in('status', ['scheduled', 'in_consultation'])
      .neq('id', currentAppointmentId);

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

    if (!appointment || !selectedDoctor || !date || !time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const appointmentDate = format(date, 'yyyy-MM-dd');

      // Check for time conflicts
      const hasConflict = await checkTimeConflict(selectedDoctor, appointmentDate, time, appointment.id);
      if (hasConflict) {
        toast.error('Time conflict: This doctor already has an appointment within 30 minutes of this time');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          doctor_id: selectedDoctor,
          appointment_date: appointmentDate,
          appointment_time: time,
          status,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Appointment updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Appointment</DialogTitle>
          <DialogDescription>
            Update appointment details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info (Read-only) */}
          <div className="p-4 bg-accent/50 rounded-lg">
            <Label className="text-sm text-muted-foreground">Patient</Label>
            <p className="font-medium">
              {appointment.patient?.first_name} {appointment.patient?.last_name}
            </p>
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

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as AppointmentStatus)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_consultation">In Consultation</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
