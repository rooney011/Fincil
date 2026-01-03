import { useState, useEffect } from 'react';
import { UserProfile } from '../types/database';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, Tooltip, CartesianGrid,
    LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, MessageSquare, Send } from 'lucide-react';

interface ExpenseAnalysisProps {
    profile: UserProfile;
}

interface CategoryData {
    category: string;
    total: number;
    percentage: number;
    count: number;
    [key: string]: string | number; // Index signature for recharts compatibility
}

interface TrendData {
    period: string;
    amount: number;
}

interface Summary {
    total_spent: number;
    daily_average: number;
    transaction_count: number;
    top_category: string | null;
    date_range_days: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function ExpenseAnalysis({ profile }: ExpenseAnalysisProps) {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState(30);

    // Q&A State
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isAsking, setIsAsking] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [days, profile.id]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;

            // Fetch summary
            const summaryRes = await fetch(`${apiUrl}/api/expense/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: profile.id, days })
            });
            const summaryData = await summaryRes.json();
            setSummary(summaryData);

            // Fetch categories
            const categoriesRes = await fetch(`${apiUrl}/api/expense/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: profile.id, days })
            });
            const categoriesData = await categoriesRes.json();
            setCategories(categoriesData.categories || []);

            // Fetch trends
            const trendsRes = await fetch(`${apiUrl}/api/expense/trends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: profile.id, days })
            });
            const trendsData = await trendsRes.json();
            setTrends(trendsData.trends || []);

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskQuestion = async (q?: string) => {
        const queryQuestion = q || question;
        if (!queryQuestion.trim()) return;

        setIsAsking(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/expense/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: profile.id, question: queryQuestion })
            });

            const data = await res.json();
            setAnswer(data.answer);
            setSuggestions(data.suggested_questions || []);

        } catch (error) {
            console.error('Error asking question:', error);
            setAnswer('Error: Could not analyze your question.');
        } finally {
            setIsAsking(false);
            setQuestion('');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Expense Analysis</h2>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-black"
                >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Spent</h3>
                        <DollarSign className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-black">₹{summary?.total_spent.toFixed(2) || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {days} days</p>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Daily Average</h3>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-black">₹{summary?.daily_average.toFixed(2) || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Per day</p>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Top Category</h3>
                        <ShoppingBag className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-xl font-bold text-black">{summary?.top_category || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">{summary?.transaction_count || 0} transactions</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Pie Chart */}
                <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">Spending by Category</h3>
                    {categories.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categories}
                                    dataKey="total"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={(props) => `${(props.payload as CategoryData).category}: ${(props.payload as CategoryData).percentage}%`}
                                >
                                    {categories.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No expense data available
                        </div>
                    )}
                </div>

                {/* Spending Trends */}
                <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">Spending Trends</h3>
                    {trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No trend data available
                        </div>
                    )}
                </div>
            </div>

            {/* AI Q&A Section */}
            <div className="bg-gray-50 rounded-xl border border-gray-300 p-6">
                <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Ask About Your Expenses
                </h3>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                            placeholder="e.g., How much did I spend on food?"
                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500"
                            disabled={isAsking}
                        />
                        <button
                            onClick={() => handleAskQuestion()}
                            disabled={isAsking || !question.trim()}
                            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {isAsking ? 'Analyzing...' : 'Ask'}
                        </button>
                    </div>

                    {answer && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                            <p className="text-black">{answer}</p>
                        </div>
                    )}

                    {suggestions.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-600 mb-2">Suggested questions:</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((sugg, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAskQuestion(sugg)}
                                        className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {sugg}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
