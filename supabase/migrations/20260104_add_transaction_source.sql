-- Add source column to transactions table to track origin
-- 'uploaded' = from bank statement upload
-- 'logged' = from AI Council purchase decision

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'uploaded' 
CHECK (source IN ('uploaded', 'logged'));

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- Comment on the column
COMMENT ON COLUMN transactions.source IS 'Origin of transaction: uploaded (from bank statement) or logged (from AI Council decision)';
