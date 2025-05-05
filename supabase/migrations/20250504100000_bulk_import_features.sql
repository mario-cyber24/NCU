-- Create email_logs table for tracking email notifications
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL UNIQUE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on recipient_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_logs (email_type);

-- Create import_audit_logs table for tracking bulk imports
CREATE TABLE IF NOT EXISTS public.import_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id TEXT NOT NULL UNIQUE,
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    file_name TEXT,
    record_count INTEGER NOT NULL,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on performed_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_import_audit_performed_by ON public.import_audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_import_audit_status ON public.import_audit_logs (status);

-- Add RLS policies to email_logs table
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access email logs
CREATE POLICY "Admins can view all email logs" 
    ON public.email_logs 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Add RLS policies to import_audit_logs table
ALTER TABLE public.import_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view all import audit logs
CREATE POLICY "Admins can view all import audit logs" 
    ON public.import_audit_logs 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Admins who performed the import can update their own logs
CREATE POLICY "Admins can update their own import logs" 
    ON public.import_audit_logs 
    FOR UPDATE
    TO authenticated 
    USING (
        performed_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Add role-based access control column to profiles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'regular';
    END IF;
END $$;

-- Create a view for user import status
CREATE OR REPLACE VIEW public.user_import_status AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    EXISTS (
        SELECT 1 FROM public.email_logs e 
        WHERE e.recipient_email = p.email AND e.email_type = 'welcome_email'
    ) AS welcome_email_sent,
    (
        SELECT e.status
        FROM public.email_logs e
        WHERE e.recipient_email = p.email AND e.email_type = 'welcome_email'
        ORDER BY e.sent_at DESC
        LIMIT 1
    ) AS email_status,
    (
        SELECT i.import_id 
        FROM public.import_audit_logs i
        JOIN public.email_logs e ON e.message_id LIKE CONCAT(i.import_id, '%')
        WHERE e.recipient_email = p.email
        ORDER BY i.started_at DESC
        LIMIT 1
    ) AS import_batch_id
FROM 
    public.profiles p;

-- Create security policies to ensure role-based access for the bulk import feature
CREATE POLICY "Only admins can insert bulk imports" 
    ON public.import_audit_logs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT ON public.user_import_status TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.import_audit_logs TO authenticated;