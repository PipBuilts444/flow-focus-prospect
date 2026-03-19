
-- Add soft delete fields to deals
ALTER TABLE public.deals
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamp with time zone,
  ADD COLUMN deleted_by text;

-- Add soft delete fields to contacts
ALTER TABLE public.contacts
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamp with time zone,
  ADD COLUMN deleted_by text;

-- Add soft delete fields to companies
ALTER TABLE public.companies
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamp with time zone,
  ADD COLUMN deleted_by text;
