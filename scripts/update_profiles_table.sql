-- Agregar campos adicionales a la tabla profiles para el onboarding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS estimated_income INTEGER,
ADD COLUMN IF NOT EXISTS preferred_categories INTEGER[];

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
