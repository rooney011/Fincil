export interface UserProfile {
  id: string;
  income_type: 'variable' | 'fixed';
  risk_tolerance: 'low' | 'medium' | 'high';
  financial_goal: string;
  monthly_income: number;
  monthly_expenses: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  transaction_date: string;
  created_at: string;
  embedding?: number[];
}

export interface AgentConversation {
  id: string;
  user_id: string;
  query: string;
  miser_response: string | null;
  visionary_response: string | null;
  twin_response: string | null;
  final_decision: string | null;
  created_at: string;
}

export type AgentType = 'miser' | 'visionary' | 'twin';

export interface AgentMessage {
  agent: AgentType;
  content: string;
  status: 'thinking' | 'speaking' | 'idle';
}
