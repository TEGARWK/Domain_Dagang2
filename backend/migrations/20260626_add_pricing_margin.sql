-- Migration: Add margin column to pricing table
-- This allows admins to set markup percentage for each TLD

ALTER TABLE pricing ADD COLUMN IF NOT EXISTS margin DECIMAL(5,2) DEFAULT 1.00;

-- Update margin description comment
COMMENT ON COLUMN pricing.margin IS 'Markup multiplier. 1.00 = no markup, 1.20 = 20% markup';
