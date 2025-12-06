/*
  # Financial Council Database Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - User unique identifier
      - `income_type` (text) - 'variable' or 'fixed'
      - `risk_tolerance` (text) - 'low', 'medium', 'high'
      - `financial_goal` (text) - User's main financial goal
      - `monthly_income` (float) - Average monthly income
      - `monthly_expenses` (float) - Average monthly expenses
      - `created_at` (timestamptz) - Profile creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - References user_profiles
      - `amount` (float) - Transaction amount
      - `description` (text) - Transaction description
      - `category` (text) - Transaction category
      - `transaction_date` (timestamptz) - When transaction occurred
      - `created_at` (timestamptz) - Record creation timestamp
      - `embedding` (vector(1536)) - Vector embedding for semantic search
    
    - `agent_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - References user_profiles
      - `query` (text) - User's financial question
      - `miser_response` (text) - Conservative agent's response
      - `visionary_response` (text) - Ambitious agent's response
      - `twin_response` (text) - Balanced agent's response
      - `final_decision` (text) - Consensus decision
      - `created_at` (timestamptz) - Conversation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
  
  3. Extensions
    - Enable pgvector for semantic search capabilities
*/

-- Enable the pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_type text NOT NULL CHECK (income_type IN ('variable', 'fixed')),
  risk_tolerance text NOT NULL CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  financial_goal text NOT NULL,
  monthly_income float NOT NULL DEFAULT 0,
  monthly_expenses float NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table with vector support
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount float NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  embedding vector(1536)
);

-- Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  miser_response text,
  visionary_response text,
  twin_response text,
  final_decision text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_date ON agent_conversations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for agent_conversations
CREATE POLICY "Users can view own conversations"
  ON agent_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
  ON agent_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create hybrid search function for semantic + SQL filtering
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  description text,
  amount float,
  category text,
  transaction_date timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    description,
    amount,
    category,
    transaction_date,
    1 - (transactions.embedding <=> query_embedding) AS similarity
  FROM transactions
  WHERE 
    1 - (transactions.embedding <=> query_embedding) > match_threshold
    AND user_id = filter_user_id
  ORDER BY transactions.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();