export type UserPosition = 'doctor' | 'nurse';

export type AppointmentStatus = 
  | 'scheduled' 
  | 'in_consultation' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  position: UserPosition;
  doctor_id?: string;
  created_at?: string;
}

export interface Doctor {
  id: string;
  email: string;
  full_name: string;
  specialty?: string;
  created_at?: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  telegram_id?: string;
  age?: number;
  created_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  complaint?: string;
  status: AppointmentStatus;
  telegram_id?: string;
  created_at?: string;
  updated_at?: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface RescheduleWebhookPayload {
  doctor_name: string;
  patient_first_name: string;
  patient_last_name: string;
  appointment_date: string;
  appointment_time: string;
}
