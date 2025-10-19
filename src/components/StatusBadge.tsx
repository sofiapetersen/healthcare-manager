import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '@/types';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'scheduled':
        return 'bg-[hsl(var(--status-scheduled))] text-white hover:bg-[hsl(var(--status-scheduled))]';
      case 'in_consultation':
        return 'bg-[hsl(var(--status-in-consultation))] text-white hover:bg-[hsl(var(--status-in-consultation))]';
      case 'completed':
        return 'bg-[hsl(var(--status-completed))] text-white hover:bg-[hsl(var(--status-completed))]';
      case 'cancelled':
        return 'bg-[hsl(var(--status-cancelled))] text-white hover:bg-[hsl(var(--status-cancelled))]';
      case 'no_show':
        return 'bg-[hsl(var(--status-no-show))] text-white hover:bg-[hsl(var(--status-no-show))]';
      default:
        return '';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_consultation':
        return 'In Consultation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  return (
    <Badge className={getStatusStyles()}>
      {getStatusLabel()}
    </Badge>
  );
};
