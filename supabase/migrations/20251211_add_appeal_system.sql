/*
  # Appeal System Migration
  
  Creates the appeal_rounds table to store negotiation/rebuttal attempts.
  
  This allows users to submit counter-arguments when purchases are rejected,
  enabling the Council to reconsider based on new context.
*/

-- Create appeal_rounds table
CREATE TABLE IF NOT EXISTS appeal_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES agent_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  original_query text NOT NULL,
  original_amount float NOT NULL,
  appeal_text text NOT NULL,
  appeal_round int NOT NULL DEFAULT 1,
  previous_debate_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_debate_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_verdict text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appeals_conversation_id ON appeal_rounds(conversation_id);
CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON appeal_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_created_at ON appeal_rounds(created_at DESC);

-- Enable Row Level Security
ALTER TABLE appeal_rounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appeal_rounds
CREATE POLICY "Users can view own appeals"
  ON appeal_rounds FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own appeals"
  ON appeal_rounds FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add optional fields to agent_conversations for tracking appeals
ALTER TABLE agent_conversations 
  ADD COLUMN IF NOT EXISTS appeal_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verdict text;

-- Create index on appeal_count
CREATE INDEX IF NOT EXISTS idx_conversations_appeal_count ON agent_conversations(appeal_count);
