-- Migration: Create contracts table
-- Date: 2025-10-25
-- Description: Add contracts/documents table for storing advertisement agreements

BEGIN;

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_number VARCHAR(50) UNIQUE,
  contract_date TIMESTAMP DEFAULT NOW(),
  
  -- Show and schedule info
  show_name VARCHAR(255),
  scheduled_at TIMESTAMP,
  duration_seconds INTEGER,
  cost DECIMAL(10, 2),
  
  -- Customer info snapshot
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Company info
  company_name VARCHAR(255) DEFAULT 'ТВ Компания X',
  
  -- Document content
  description TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'sent', -- sent, viewed, downloaded
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  viewed_at TIMESTAMP,
  downloaded_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX idx_contracts_application_id ON contracts(application_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);

-- Generate contract number sequence
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1000;

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  contract_num VARCHAR;
BEGIN
  next_num := nextval('contract_number_seq');
  contract_num := 'DOG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN contract_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate contract number
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_contract_number
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

COMMIT;

-- Verification query
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;
