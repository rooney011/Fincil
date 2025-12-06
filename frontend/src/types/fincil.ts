// types/fincil.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string
  category: string
  transaction_date: string
  created_at: string
  // Note: We usually don't fetch the raw embedding to the frontend
}

export interface UserProfile {
  id: string
  income_type: 'variable' | 'fixed'
  risk_tolerance: 'low' | 'medium' | 'high'
  financial_goal: string | null
  monthly_income: number | null
  monthly_expenses: number | null
  created_at: string
}

export interface AgentConversation {
  id: string
  user_id: string
  query: string
  miser_response: string | null
  visionary_response: string | null
  twin_response: string | null
  final_decision: string | null
  created_at: string
}