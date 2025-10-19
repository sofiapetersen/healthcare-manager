import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, Clock, User, Phone, FileText, Stethoscope, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: Appointment) => void;
}

export const AppointmentDetailsModal = ({ 
  appointment, 
  open, 
  onOpenChange,
  onEdit 
}: AppointmentDetailsModalProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  if (!appointment) return null;

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Appointment cancelled successfully');
      setShowCancelDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleRequestReschedule = async () => {
    if (!appointment.patient || !appointment.doctor) {
      toast.error('Missing patient or doctor information');
      return;
    }

    setIsRescheduling(true);

    try {
      const payload = {
        doctor_name: appointment.doctor.full_name,
        patient_first_name: appointment.patient.first_name,
        patient_last_name: appointment.patient.last_name || '',
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
      };

      const response = await fetch('https://n8n.maxgrow.pro/webhook/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to send reschedule request');
      }

      toast.success('Reschedule request sent to patient via Telegram');
    } catch (error) {
      console.error('Error sending reschedule request:', error);
      toast.error('Failed to send reschedule request');
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Appointment Details</DialogTitle>
            <DialogDescription>
              View and manage appointment information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status */}
            <div>
              <StatusBadge status={appointment.status} />
            </div>

            {/* Patient Information */}
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-medium">{appointment.patient?.age || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </p>
                  <p className="font-medium">{appointment.patient?.phone}</p>
                </div>
              </div>
            </div>

            {/* Doctor Information */}
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Doctor Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{appointment.doctor?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Specialty</p>
                  <p className="font-medium">{appointment.doctor?.specialty || 'General'}</p>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
              <h3 className="font-semibold text-lg">Appointment Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date
                  </p>
                    <p className="font-medium">
                    {format(new Date(appointment.appointment_date + 'T00:00:00'), 'MMMM dd, yyyy')}
                    </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Time
                  </p>
                  <p className="font-medium">{appointment.appointment_time}</p>
                </div>
                {appointment.complaint && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Chief Complaint
                    </p>
                    <p className="font-medium mt-1">{appointment.complaint}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => onEdit(appointment)}
                className="flex-1"
                variant="outline"
              >
                Edit Appointment
              </Button>
              <Button 
                onClick={handleRequestReschedule}
                disabled={isRescheduling}
                className="flex-1"
                variant="secondary"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {isRescheduling ? 'Sending...' : 'Request Reschedule'}
              </Button>
              <Button 
                onClick={() => setShowCancelDialog(true)}
                variant="destructive"
                className="flex-1"
              >
                Cancel Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
