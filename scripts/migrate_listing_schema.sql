-- Migration: Add backCoverText to listings and update exports table
-- Run this on your database after deployment

-- Add backCoverText column to listings table
ALTER TABLE listings ADD COLUMN back_cover_text TEXT;

-- Add new columns to exports table
ALTER TABLE exports ADD COLUMN format TEXT DEFAULT 'pdf';
ALTER TABLE exports ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE exports ADD COLUMN completed_at INTEGER;

-- Note: SQLite doesn't support dropping NOT NULL constraint easily
-- The filePath column change (making it nullable) may require recreating the table
-- For now, the code handles null filePath gracefully
