-- Migration: Add Indexes for Performance
-- Run this in your Supabase SQL Editor

-- 1. Index for fast Email lookups (Login / Claim)
CREATE INDEX IF NOT EXISTS idx_participants_email ON "Participants" (email);

-- 2. Index for serial number verification scans
CREATE INDEX IF NOT EXISTS idx_participants_serial ON "Participants" (serial_number);

-- 3. Composite Index for fast "Check if claimed" logic
CREATE INDEX IF NOT EXISTS idx_participants_claimed_email ON "Participants" (email, is_claimed);

-- 4. Index for Event ID (Prepare for Multi-tenancy)
-- Note: You may need to add this column first if it doesn't exist
-- ALTER TABLE "Participants" ADD COLUMN IF NOT EXISTS event_id text DEFAULT 'default';
-- CREATE INDEX IF NOT EXISTS idx_participants_event_id ON "Participants" (event_id);
