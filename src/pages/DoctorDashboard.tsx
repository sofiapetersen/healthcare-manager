import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { LogOut, Clock, CheckCircle, XCircle, User, FileText, Activity, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DoctorDashboard = () => {
  const { userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [nextAppointments, setNextAppointments] = useState<Appointment[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [selectedForNoShow, setSelectedForNoShow] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && (!userProfile || userProfile.position.trim() !== 'doctor')) {
      navigate('/auth');
    }
  }, [userProfile, loading, navigate]);

  useEffect(() => {
    if (userProfile?.position.trim() === 'doctor' && userProfile.doctor_id) {
      fetchAppointments();
      subscribeToAppointments();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchAppointments, 30000);
      return () => clearInterval(interval);
    }
  }, [userProfile, selectedDate]);

  useEffect(() => {
    organizeAppointments();
  }, [appointments]);

  const fetchAppointments = async () => {
    if (!userProfile?.doctor_id) return;

    try {
      setIsLoading(true);
      const searchDate = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('doctor_id', userProfile.doctor_id)
        .eq('appointment_date', searchDate)
        .in('status', ['scheduled', 'in_consultation', 'completed'])
        .order('appointment_time', { ascending: true });
      
      if (error) throw error;
      setAppointments(data as Appointment[] || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToAppointments = () => {
    const channel = supabase
      .channel('doctor-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const organizeAppointments = () => {
    const current = appointments.find(apt => apt.status === 'in_consultation');
    const scheduled = appointments.filter(apt => apt.status === 'scheduled').slice(0, 5);
    const completed = appointments.filter(apt => apt.status === 'completed').length;

    setCurrentAppointment(current || null);
    setNextAppointments(scheduled);
    setCompletedCount(completed);
  };

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_consultation' })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Consultation started');
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', currentAppointment.id);

      if (error) throw error;
      toast.success('Consultation completed');
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('Failed to complete consultation');
    }
  };

  const handleMarkNoShow = async () => {
    if (!selectedForNoShow) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', selectedForNoShow.id);

      if (error) throw error;
      toast.success('Marked as no-show');
      setShowNoShowDialog(false);
      setSelectedForNoShow(null);
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error('Failed to mark as no-show');
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return `***-***-${phone.slice(-4)}`;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Doctor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Dr. {userProfile?.full_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'gap-2',
                    selectedDate.toDateString() !== new Date().toDateString() && 'border-primary'
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                  <p className="text-3xl font-bold text-[hsl(var(--status-scheduled))]">
                    {nextAppointments.length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-[hsl(var(--status-scheduled))]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Consultation</p>
                  <p className="text-3xl font-bold text-[hsl(var(--status-in-consultation))]">
                    {currentAppointment ? 1 : 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-[hsl(var(--status-in-consultation))]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-[hsl(var(--status-completed))]">
                    {completedCount}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-[hsl(var(--status-completed))]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Patient */}
        {currentAppointment && (
          <Card className="border-[hsl(var(--status-in-consultation))] border-2">
            <CardHeader className="bg-[hsl(var(--status-in-consultation))]/10">
              <CardTitle className="flex items-center gap-2 text-[hsl(var(--status-in-consultation))]">
                <Activity className="w-5 h-5" />
                Current Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {currentAppointment.patient?.first_name} {currentAppointment.patient?.last_name}
                    </h3>
                    <p className="text-muted-foreground">
                      Age: {currentAppointment.patient?.age || 'N/A'} | Started: {currentAppointment.appointment_time}
                    </p>
                  </div>
                </div>

                {currentAppointment.complaint && (
                  <div className="p-4 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Chief Complaint
                    </p>
                    <p className="text-base">{currentAppointment.complaint}</p>
                  </div>
                )}

                <Button 
                  onClick={handleCompleteConsultation}
                  className="w-full bg-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed))]/90"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Consultation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Next Patients
            </CardTitle>
            <CardDescription>
              {nextAppointments.length} patient{nextAppointments.length !== 1 ? 's' : ''} waiting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No patients in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextAppointments.map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {appointment.patient?.first_name} {appointment.patient?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Age: {appointment.patient?.age || 'N/A'} | Phone: {maskPhone(appointment.patient?.phone || '')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">{appointment.appointment_time}</p>
                        <StatusBadge status={appointment.status} />
                      </div>
                    </div>

                    {appointment.complaint && (
                      <div className="mb-3 p-3 bg-accent/30 rounded">
                        <p className="text-sm text-muted-foreground mb-1">Chief Complaint</p>
                        <p className="text-sm">{appointment.complaint}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStartConsultation(appointment.id)}
                        disabled={!!currentAppointment}
                        className="flex-1"
                      >
                        Start Consultation
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedForNoShow(appointment);
                          setShowNoShowDialog(true);
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        No Show
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No Show Dialog */}
      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this patient as no-show? This action can be undone by the nurse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkNoShow} className="bg-[hsl(var(--status-no-show))] text-white hover:bg-[hsl(var(--status-no-show))]/90">
              Mark as No-Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DoctorDashboard;
