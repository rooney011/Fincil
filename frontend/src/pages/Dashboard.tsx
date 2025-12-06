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
  UploadCloud
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
  // Chat State
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType | 'idle'>('idle');
  
  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);

  // Scroll Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessages = useRef<Record<AgentType, string>>({
    miser: '',
    visionary: '',
    twin: '',
  });

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
          income_type: editForm.income_type
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      onProfileUpdate(editForm); // Update parent state
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 2. HELPER TO UPDATE MESSAGES ---
  const updateMessagesState = () => {
    setMessages([
      { agent: 'miser', content: currentMessages.current.miser },
      { agent: 'visionary', content: currentMessages.current.visionary },
      { agent: 'twin', content: currentMessages.current.twin },
    ].filter((m) => m.content) as AgentMessage[]);
  };

  // --- 3. HANDLE SUBMIT (API CALL) ---
  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setMessages([]);
    setActiveAgent('idle');
    currentMessages.current = { miser: '', visionary: '', twin: '' };

    try {
      // Call Python Backend
      const res = await fetch('http://127.0.0.1:8000/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          user_id: profile.id
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch debate');
      const data = await res.json();
      
      // Stream Miser Response
      setActiveAgent('miser');
      const miserText = data.miser || "I have nothing to say.";
      for (let i = 0; i < miserText.length; i++) {
        currentMessages.current.miser += miserText[i];
        updateMessagesState();
        await new Promise(r => setTimeout(r, 10));
      }
      await new Promise(r => setTimeout(r, 500));

      // Stream Visionary Response
      setActiveAgent('visionary');
      const visionaryText = data.visionary || "I see no future.";
      for (let i = 0; i < visionaryText.length; i++) {
        currentMessages.current.visionary += visionaryText[i];
        updateMessagesState();
        await new Promise(r => setTimeout(r, 10));
      }
      await new Promise(r => setTimeout(r, 500));

      // Stream Twin Response
      setActiveAgent('twin');
      const twinText = data.twin || "Proceed with caution.";
      for (let i = 0; i < twinText.length; i++) {
        currentMessages.current.twin += twinText[i];
        updateMessagesState();
        await new Promise(r => setTimeout(r, 10));
      }

      setActiveAgent('idle');
    } catch (error) {
      console.error('Error calling AI Council:', error);
      setMessages(prev => [...prev, { agent: 'twin', content: "Error: The Council is offline. Is the backend running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. CALCULATIONS (Fixed: Placed before return) ---
  const surplus = profile.monthly_income - profile.monthly_expenses;
  const survivalDays = profile.monthly_expenses > 0 
    ? Math.floor((surplus / profile.monthly_expenses) * 30) 
    : 0;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Header */}
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
                    ${surplus.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Runway</p>
                  <p className="text-lg font-bold text-black">{survivalDays}d</p>
                </div>
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
        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Income</h3>
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <p className="text-2xl font-bold text-black">${profile.monthly_income.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{profile.income_type} income</p>
          </div>

          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Expenses</h3>
              <DollarSign className="w-4 h-4 text-black" />
            </div>
            <p className="text-2xl font-bold text-black">${profile.monthly_expenses.toFixed(2)}</p>
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

        {/* Chat & Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-96">
              <CouncilChamber activeAgent={activeAgent} />
            </div>

            <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Consult the Council</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Can I afford a $500 purchase?"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                  disabled={isLoading}
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount ($)"
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !query.trim()}
                    className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isLoading ? 'Debating...' : 'Ask'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 backdrop-blur-sm rounded-xl border border-gray-300 p-6 flex flex-col h-[600px]">
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
                  className={`p-4 rounded-lg border-l-4 ${
                    msg.agent === 'miser'
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

      {/* Profile Modal */}
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
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Monthly Income</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black"
                        value={editForm.monthly_income}
                        onChange={(e) => setEditForm({...editForm, monthly_income: parseFloat(e.target.value)})}
                      />
                    ) : (
                      <p className="text-lg font-semibold text-black">${profile.monthly_income}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Monthly Expenses</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black"
                        value={editForm.monthly_expenses}
                        onChange={(e) => setEditForm({...editForm, monthly_expenses: parseFloat(e.target.value)})}
                      />
                    ) : (
                      <p className="text-lg font-semibold text-black">${profile.monthly_expenses}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 md:col-span-2">
                    <label className="text-xs text-gray-500 uppercase font-bold">Primary Goal</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black"
                        value={editForm.financial_goal || ''}
                        onChange={(e) => setEditForm({...editForm, financial_goal: e.target.value})}
                      />
                    ) : (
                      <p className="text-lg font-semibold text-black">{profile.financial_goal}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs text-gray-500 uppercase font-bold">Risk Tolerance</label>
                    {isEditing ? (
                      <select 
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black"
                        value={editForm.risk_tolerance}
                        onChange={(e) => setEditForm({...editForm, risk_tolerance: e.target.value as 'low'|'medium'|'high'})}
                      >
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
                      <select 
                        className="w-full mt-1 bg-white border border-gray-300 rounded p-1 text-black"
                        value={editForm.income_type}
                        onChange={(e) => setEditForm({...editForm, income_type: e.target.value as 'fixed'|'variable'})}
                      >
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
                <p className="text-sm text-gray-600 mb-4">
                  Upload a PDF or CSV bank statement to give the agents more context about your spending habits.
                </p>
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