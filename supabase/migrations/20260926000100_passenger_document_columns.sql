-- Ensure request_mode column exists on requests (used by customer/bookings and customer/requests pages)
alter table public.requests
  add column if not exists request_mode text not null default 'ENQUIRY'
    check (request_mode in ('ENQUIRY', 'BOOKING'));

-- Ensure passenger_documents has all columns the application code references
-- (these may already exist from 20260925000200/300 if those migrations ran)
alter table public.passenger_documents
  add column if not exists visa_type text,
  add column if not exists original_document_seen boolean not null default false,
  add column if not exists original_verified_by uuid references public.profiles(id),
  add column if not exists original_verified_at timestamptz,
  add column if not exists verification_notes text;
