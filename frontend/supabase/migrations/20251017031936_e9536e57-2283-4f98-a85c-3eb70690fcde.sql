-- Add complaint field to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS complaint TEXT;

-- Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- RLS Policies for doctors (read-only for authenticated users)
CREATE POLICY "Authenticated users can view doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for patients
CREATE POLICY "Authenticated users can view patients"
ON public.patients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Nurses can create patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'nurse'
  )
);

CREATE POLICY "Nurses can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'nurse'
  )
);

-- RLS Policies for appointments
CREATE POLICY "Doctors can view their own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  doctor_id IN (
    SELECT doctor_id FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'doctor'
  )
);

CREATE POLICY "Nurses can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'nurse'
  )
);

CREATE POLICY "Nurses can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'nurse'
  )
);

CREATE POLICY "Nurses can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'nurse'
  )
);

CREATE POLICY "Doctors can update their own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  doctor_id IN (
    SELECT doctor_id FROM public.user_profiles
    WHERE id = auth.uid() AND position = 'doctor'
  )
);

-- Enable real-time for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();