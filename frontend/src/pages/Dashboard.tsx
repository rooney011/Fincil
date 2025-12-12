import { useState, useEffect, useRef } from 'react';
import { UserProfile, AgentType } from '../types/database';
import { supabase } from '../lib/supabase';
import CouncilChamber from '../components/CouncilChamber';
import StatementUploader from '../components/StatementUploader';
import {
  Send,
  TrendingUp,
  DollarSign,
  Calendar,
  Zap,
  LogOut,
  User,
  X,
  Save,
  UploadCloud,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  onLogout: () => void;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

interface AgentMessage {
  agent: AgentType;
  content: string;
}

export default function Dashboard({ profile, onLogout, onProfileUpdate }: DashboardProps) {
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType | 'idle'>('idle');
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  // Appeal System State
  const [isRejected, setIsRejected] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [appealRound, setAppealRound] = useState(1);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- 1. HANDLE PROFILE SAVING ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          monthly_income: editForm.monthly_income,
          monthly_expenses: editForm.monthly_expenses,
          financial_goal: editForm.financial_goal,
          risk_tolerance: editForm.risk_tolerance,
          income_type: editForm.income_type,
          role: editForm.role
        })
        .eq('id', profile.id);

      if (error) throw error;

      onProfileUpdate(editForm);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to save profile changes. Check if the role is allowed.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 2. VERDICT HELPER ---
  const parseVerdict = (text: string) => {
    const upper = text.toUpperCase();
    return upper.includes("REJECTED") || upper.startsWith("NO") || upper.includes("BLOCKED");
  };

  // --- 3. HANDLE CHAT SUBMIT ---
  const handleSubmit = async () => {
    if (!query.trim() || !amount) return;

    setIsLoading(true);
    setMessages([]);
    setActiveAgent('idle');
    setAwaitingDecision(false);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          user_id: profile.id,
          amount: parseFloat(amount) || 0
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch debate');
      const data = await res.json();

      const transcript = data.transcript || [];

      for (const turn of transcript) {
        const agentName = turn.agent as AgentType;
        const content = turn.content;

        setActiveAgent(agentName);

        let displayedContent = "";
        setMessages(prev => [...prev, { agent: agentName, content: "" }]);

        for (let i = 0; i < content.length; i++) {
          displayedContent += content[i];
          setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { agent: agentName, content: displayedContent };
            return newArr;
          });
          await new Promise(r => setTimeout(r, 10));
        }

        await new Promise(r => setTimeout(r, 600));

        if (agentName === 'twin') {
          const rejected = parseVerdict(content);
          setIsRejected(rejected);
          setAwaitingDecision(true);  // Show decision dialog for both APPROVED and REJECTED
        }
      }

      setActiveAgent('idle');

    } catch (error) {
      console.error('Error calling AI Council:', error);
      setMessages(prev => [...prev, { agent: 'twin', content: "Error: Council offline." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. HANDLE USER DECISION ---
  const handleDecision = async (choice: 'buy' | 'save') => {
    if (isProcessingDecision) return;

    if (choice === 'save') {
      setMessages(prev => [...prev, { agent: 'miser', content: "Wise choice. Saving represents freedom." }]);
      setAwaitingDecision(false);
      setQuery('');
      setAmount('');
      return;
    }

    if (!amount) {
      alert("Please enter the price amount.");
      return;
    }

    setIsProcessingDecision(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/execute-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          description: query,
          amount: parseFloat(amount),
          category: "Discretionary"
        }),
      });

      if (!res.ok) throw new Error("Failed to log transaction");

      const result = await res.json();

      const actualDeduction = (result.deducted_amount !== undefined)
        ? result.deducted_amount
        : parseFloat(amount);

      setMessages(prev => [...prev, { agent: 'visionary', content: `Transaction logged. Deducted: ₹${actualDeduction.toFixed(2)}` }]);

      const newExpenses = profile.monthly_expenses + actualDeduction;
      onProfileUpdate({ ...profile, monthly_expenses: newExpenses });

    } catch (error) {
      console.error(error);
      alert("Error logging transaction");
    } finally {
      setIsProcessingDecision(false);
      setAwaitingDecision(false);
      setQuery('');
      setAmount('');
    }
  };

  // --- 5. HANDLE APPEAL SUBMISSION ---
  const handleAppealSubmit = async () => {
    if (!appealText.trim()) {
      alert("Please provide your justification.");
      return;
    }

    setIsLoading(true);
    setAwaitingDecision(false);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          conversation_id: conversationId,
          original_query: query,
          amount: parseFloat(amount),
          appeal_text: appealText,
          previous_debate: messages,
          appeal_round: appealRound
        }),
      });

      if (!res.ok) throw new Error('Appeal failed');
      const data = await res.json();

      // Add appeal marker to transcript
      setMessages(prev => [...prev, {
        agent: 'twin',
        content: `📢 APPEAL #${appealRound}: "${appealText}"`
      }]);

      // Stream new transcript
      for (const turn of data.transcript) {
        setActiveAgent(turn.agent);
        let displayedContent = "";
        setMessages(prev => [...prev, { agent: turn.agent, content: "" }]);

        for (let i = 0; i < turn.content.length; i++) {
          displayedContent += turn.content[i];
          setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { agent: turn.agent, content: displayedContent };
            return newArr;
          });
          await new Promise(r => setTimeout(r, 10));
        }
        await new Promise(r => setTimeout(r, 600));
      }

      // Check new verdict
      const newVerdict = data.verdict;
      setIsRejected(newVerdict === 'REJECTED');
      setAwaitingDecision(true);  // Show decision dialog again

      if (newVerdict === 'REJECTED') {
        setAppealRound(prev => prev + 1);
      }

      setAppealText('');
      setActiveAgent('idle');

    } catch (error) {
      console.error('Appeal error:', error);
      alert('Failed to submit appeal');
      setAwaitingDecision(true);  // Allow retry
    } finally {
      setIsLoading(false);
    }
  };

  const surplus = profile.monthly_income - profile.monthly_expenses;

  return (
    <div className="min-h-screen bg-white relative">
      <div className="border-b border-gray-300 bg-gray-50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-black">Financial Council</h1>
                <p className="text-sm text-gray-600">Your AI Financial Advisors</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-600">Monthly Surplus</p>
                  <p className={`text-lg font-bold ${surplus >= 0 ? 'text-black' : 'text-red-600'}`}>
                    ₹{surplus.toFixed(2)}
                  </p>
                </div>
                {/* RUNWAY REMOVED FROM HERE */}
              </div>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all border border-gray-300"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Income</h3>
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <p className="text-2xl font-bold text-black">₹{profile.monthly_income.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{profile.income_type} income</p>
          </div>

          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Expenses</h3>
              <DollarSign className="w-4 h-4 text-black" />
            </div>
            <p className="text-2xl font-bold text-black">₹{profile.monthly_expenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {profile.monthly_income > 0 ? ((profile.monthly_expenses / profile.monthly_income) * 100).toFixed(1) : 0}% of income
            </p>
          </div>

          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Financial Goal</h3>
              <Calendar className="w-4 h-4 text-black" />
            </div>
            <p className="text-lg font-semibold text-black truncate">{profile.financial_goal}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{profile.risk_tolerance} risk tolerance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Consult the Council + Appeal Box */}
          <div className="space-y-4">
            <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Consult the Council</h3>

              {!awaitingDecision ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Can I afford a ₹5000 purchase?"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                    disabled={isLoading}
                  />
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount (₹)"
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !query.trim() || !amount}
                      className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-all flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isLoading ? 'Debating...' : 'Ask'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-center text-black font-medium mb-4">The Council has spoken. What is your decision?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDecision('save')}
                      disabled={isProcessingDecision}
                      className="p-4 bg-red-100 border-2 border-red-500 rounded-xl hover:bg-red-200 transition-all flex flex-col items-center group disabled:opacity-50"
                    >
                      <XCircle className="w-8 h-8 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-red-800">Listen to Miser</span>
                      <span className="text-xs text-red-600">Don't Buy</span>
                    </button>

                    <button
                      onClick={() => handleDecision('buy')}
                      disabled={isProcessingDecision}
                      className="p-4 bg-green-100 border-2 border-green-500 rounded-xl hover:bg-green-200 transition-all flex flex-col items-center group disabled:opacity-50"
                    >
                      <CheckCircle className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-green-800">Listen to Visionary</span>
                      <span className="text-xs text-green-600">Buy (₹{amount || 0})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Appeal Box - Below Consult Section */}
            {awaitingDecision && isRejected && (
              <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Purchase Rejected - Submit Appeal
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      The Council has blocked this purchase. Provide justification to reconsider:
                    </p>
                    <textarea
                      value={appealText}
                      onChange={(e) => setAppealText(e.target.value)}
                      placeholder="e.g., 'I cancelled my Netflix subscription to afford this'"
                      className="w-full px-4 py-3 bg-white border border-red-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-red-500 min-h-[80px] resize-none"
                      disabled={isLoading}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setAwaitingDecision(false);
                          setIsRejected(false);
                          setQuery('');
                          setAmount('');
                          setAppealText('');
                          setAppealRound(1);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        Accept Rejection
                      </button>
                      <button
                        onClick={handleAppealSubmit}
                        disabled={isLoading || !appealText.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Submitting...' : `Submit Appeal #${appealRound}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Approved Decision Box - Below Consult Section */}
            {awaitingDecision && !isRejected && (
              <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-center text-black font-medium mb-4">
                  The Council has approved. What is your decision?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleDecision('save')}
                    disabled={isProcessingDecision}
                    className="p-4 bg-red-100 border-2 border-red-500 rounded-xl hover:bg-red-200 transition-all flex flex-col items-center group disabled:opacity-50"
                  >
                    <XCircle className="w-8 h-8 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-red-800">Listen to Miser</span>
                    <span className="text-xs text-red-600">Don't Buy</span>
                  </button>
                  <button
                    onClick={() => handleDecision('buy')}
                    disabled={isProcessingDecision}
                    className="p-4 bg-green-100 border-2 border-green-500 rounded-xl hover:bg-green-200 transition-all flex flex-col items-center group disabled:opacity-50"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-green-800">Listen to Visionary</span>
                    <span className="text-xs text-green-600">Buy (₹{amount || 0})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Council Transcript */}
          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6 flex flex-col h-[700px]">
            <h3 className="text-lg font-semibold text-black mb-4">Council Transcript</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                  Ask the council a financial question to begin...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${msg.agent === 'miser'
                    ? 'bg-red-50 border-red-500'
                    : msg.agent === 'visionary'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-amber-50 border-amber-500'
                    }`}
                >
                  <p className="text-xs font-bold uppercase mb-1 text-gray-500">{msg.agent}</p>
                  <p className="text-sm text-black">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <User className="w-5 h-5" /> Profile Settings
              </h2>
              <button
                onClick={() => { setIsProfileOpen(false); setIsEditing(false); }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Your Financial Context</h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Edit Details
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsEditing(false); setEditForm(profile); }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-1 text-sm font-medium bg-black text-white px-3 py-1 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* --- ROLE DROPDOWN (Safe List Only) --- */}
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 md:col-span-2">
                    <label className="text-xs text-yellow-800 uppercase font-bold">Current Role (Affects Agent Personality)</label>
                    {isEditing ? (
                      <select
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-2 text-black font-medium"
                        value={editForm.role || 'general'}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        <option value="general">General Employee</option>
                        <option value="student">Student (No/Low Income)</option>
                        <option value="freelancer">Freelancer (Variable Income)</option>
                      </select>
                    ) : (
                      <p className="text-lg font-bold text-black capitalize">
                        {profile.role || 'General'}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Monthly Income</label>
                    {isEditing ? (
                      <input type="number" className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black" value={editForm.monthly_income} onChange={(e) => setEditForm({ ...editForm, monthly_income: parseFloat(e.target.value) })} />
                    ) : (
                      <p className="text-lg font-semibold text-black">₹{profile.monthly_income}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Monthly Expenses</label>
                    {isEditing ? (
                      <input type="number" className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black" value={editForm.monthly_expenses} onChange={(e) => setEditForm({ ...editForm, monthly_expenses: parseFloat(e.target.value) })} />
                    ) : (
                      <p className="text-lg font-semibold text-black">₹{profile.monthly_expenses}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 md:col-span-2">
                    <label className="text-xs text-gray-500 uppercase font-bold">Primary Goal</label>
                    {isEditing ? (
                      <input type="text" className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black" value={editForm.financial_goal || ''} onChange={(e) => setEditForm({ ...editForm, financial_goal: e.target.value })} />
                    ) : (
                      <p className="text-lg font-semibold text-black">{profile.financial_goal}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Risk Tolerance</label>
                    {isEditing ? (
                      <select className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black" value={editForm.risk_tolerance} onChange={(e) => setEditForm({ ...editForm, risk_tolerance: e.target.value as 'low' | 'medium' | 'high' })}>
                        <option value="low">Low (Conservative)</option>
                        <option value="medium">Medium (Balanced)</option>
                        <option value="high">High (Aggressive)</option>
                      </select>
                    ) : (
                      <p className="text-lg font-semibold text-black capitalize">{profile.risk_tolerance}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Income Type</label>
                    {isEditing ? (
                      <select className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black" value={editForm.income_type} onChange={(e) => setEditForm({ ...editForm, income_type: e.target.value as 'fixed' | 'variable' })}>
                        <option value="fixed">Fixed (Salary)</option>
                        <option value="variable">Variable (Freelance)</option>
                      </select>
                    ) : (
                      <p className="text-lg font-semibold text-black capitalize">{profile.income_type}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5" /> Import History
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                  <StatementUploader userId={profile.id} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 flex justify-end">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}