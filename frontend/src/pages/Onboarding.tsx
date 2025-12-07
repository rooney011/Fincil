import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { Zap, Target, TrendingUp, Shield, UploadCloud } from 'lucide-react';
import StatementUploader from '../components/StatementUploader'; // Make sure this path is correct
import { Briefcase, GraduationCap, Code, BookOpen } from 'lucide-react';
interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  // Now 5 Steps including upload
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    role: '' as 'student' | 'developer' | 'teacher' | 'freelancer' | 'general' | '',
    income_type: '' as 'variable' | 'fixed' | '',
    risk_tolerance: '' as 'low' | 'medium' | 'high' | '',
    financial_goal: '',
    monthly_income: '',
    monthly_expenses: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch User ID on mount (Needed for the Uploader)
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (!userId) {
        setError('Please sign in to continue');
        setLoading(false);
        return;
      }

      const profileData = {
        id: userId,
        income_type: formData.income_type as 'variable' | 'fixed',
        risk_tolerance: formData.risk_tolerance as 'low' | 'medium' | 'high',
        financial_goal: formData.financial_goal,
        monthly_income: parseFloat(formData.monthly_income),
        monthly_expenses: parseFloat(formData.monthly_expenses),
        role: formData.role,
      };

      const { data, error: insertError } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) onComplete(data as UserProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.role !== '';
      case 2:
        return formData.income_type !== '';
      case 3:
        return formData.risk_tolerance !== '';
      case 4:
        return formData.financial_goal.length > 3;
      case 5:
        return (
          formData.monthly_income !== '' &&
          parseFloat(formData.monthly_income) > 0 &&
          formData.monthly_expenses !== '' &&
          parseFloat(formData.monthly_expenses) > 0
        );
      case 6:
        // Always return true for step 5 (Upload is optional)
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">
            Financial Council
          </h1>
          <p className="text-gray-600">
            System Initialization • Step {step} of 5
          </p>
        </div>

        <div className="bg-gray-50 backdrop-blur-sm rounded-2xl border border-gray-300 p-8 shadow-2xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 mx-1 rounded-full transition-all ${
                    s <= step ? 'bg-black' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
              {/* NEW STEP 1: ROLE SELECTION */}
    {step === 1 && (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-black mb-4">Identity</h2>
            <p className="text-gray-600 mb-6">Tell us about your current occupation so we can tailor our advice.</p>
            
            <div className="grid grid-cols-1 gap-3">
                {[
                    { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Budgeting on loans/allowance' },
                    { id: 'developer', label: 'Software Developer', icon: Code, desc: 'High income potential, tech focused' },
                    { id: 'teacher', label: 'Teacher', icon: BookOpen, desc: 'Stable income, pension focused' },
                    { id: 'freelancer', label: 'Freelancer', icon: Briefcase, desc: 'Variable income, business expensing' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => updateField('role', item.id)}
                        className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                            formData.role === item.id 
                            ? 'border-black bg-black/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className={`p-2 rounded-lg ${formData.role === item.id ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-black">{item.label}</h3>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )}
          {/* STEP 2: Income Type */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-black mb-4">
                Income Pattern
              </h2>
              <p className="text-gray-600 mb-6">
                How would you describe your income flow?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => updateField('income_type', 'variable')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    formData.income_type === 'variable'
                      ? 'border-black bg-black/5'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <TrendingUp
                    className={`w-8 h-8 mb-3 ${
                      formData.income_type === 'variable'
                        ? 'text-black'
                        : 'text-gray-500'
                    }`}
                  />
                  <h3 className="text-lg font-semibold text-black mb-1">
                    Variable Income
                  </h3>
                  <p className="text-sm text-gray-600">
                    Freelance, contract work, or irregular earnings
                  </p>
                </button>

                <button
                  onClick={() => updateField('income_type', 'fixed')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    formData.income_type === 'fixed'
                      ? 'border-black bg-black/5'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <Shield
                    className={`w-8 h-8 mb-3 ${
                      formData.income_type === 'fixed'
                        ? 'text-black'
                        : 'text-gray-500'
                    }`}
                  />
                  <h3 className="text-lg font-semibold text-black mb-1">
                    Fixed Income
                  </h3>
                  <p className="text-sm text-gray-600">
                    Salary, stable monthly income, or student allowance
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Risk Profile */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-black mb-4">
                Risk Profile
              </h2>
              <p className="text-gray-600 mb-6">
                How do you approach financial decisions?
              </p>

              <div className="space-y-3">
                {[
                  {
                    value: 'low',
                    label: 'Conservative',
                    description: 'I prefer stability and avoiding risks',
                  },
                  {
                    value: 'medium',
                    label: 'Balanced',
                    description: 'I balance risk with potential rewards',
                  },
                  {
                    value: 'high',
                    label: 'Aggressive',
                    description: 'I embrace calculated risks for growth',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateField('risk_tolerance', option.value)}
                    className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                      formData.risk_tolerance === option.value
                        ? 'border-black bg-black/5'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-black mb-1">
                      {option.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Financial Goal */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-black mb-4">
                Financial Goal
              </h2>
              <p className="text-gray-600 mb-6">
                What's your primary financial objective?
              </p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-300">
                  <Target className="w-6 h-6 text-black flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.financial_goal}
                    onChange={(e) =>
                      updateField('financial_goal', e.target.value)
                    }
                    placeholder="e.g., Save for a Tesla Cybertruck, Pay off debt..."
                    className="flex-1 bg-transparent text-black placeholder-gray-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Save for house',
                    'Pay off debt',
                    'Build savings',
                    'Start business',
                    'Invest wisely',
                    'Early retirement',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => updateField('financial_goal', suggestion)}
                      className="p-3 text-sm text-gray-700 bg-white rounded-lg border border-gray-300 hover:border-black hover:text-black transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Financial Snapshot */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-black mb-4">
                Financial Snapshot
              </h2>
              <p className="text-gray-600 mb-6">
                Help us understand your cash flow (You can verify this later with uploads)
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Monthly Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.monthly_income}
                      onChange={(e) =>
                        updateField('monthly_income', e.target.value)
                      }
                      placeholder="50000"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Monthly Expenses
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.monthly_expenses}
                      onChange={(e) =>
                        updateField('monthly_expenses', e.target.value)
                      }
                      placeholder="35000"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 outline-none focus:border-black transition-all"
                    />
                  </div>
                </div>

                {formData.monthly_income &&
                  formData.monthly_expenses &&
                  parseFloat(formData.monthly_income) > 0 && (
                    <div className="p-4 bg-gray-200 border border-gray-400 rounded-lg">
                      <p className="text-sm text-black">
                        Monthly Surplus:{' '}
                        <span className="font-semibold">
                          ₹
                          {(
                            parseFloat(formData.monthly_income) -
                            parseFloat(formData.monthly_expenses)
                          ).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* STEP 6: History Upload (NEW) */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-black mb-4">
                Import History
              </h2>
              <p className="text-gray-600 mb-6">
                Upload a bank statement (PDF/CSV) to give the Agents context immediately.
              </p>
              
              {/* Insert the Uploader Component Here */}
              <div className="my-6">
                {userId ? (
                    <StatementUploader userId={userId} />
                ) : (
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                        Creating user session...
                    </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <UploadCloud className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> You can skip this now and upload later from the dashboard.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition-all"
              >
                Back
              </button>
            )}
            
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              // Final Submit Button on Step 5
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Initializing...' : 'Complete & Launch'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}