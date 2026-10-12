-- Run this in your Supabase SQL editor

-- Add image_url column to aircraft table
ALTER TABLE public.aircraft ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to yachts table  
ALTER TABLE public.yachts ADD COLUMN IF NOT EXISTS image_url text;
