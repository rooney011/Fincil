import { useState, useEffect } from 'react';
import { UserProfile } from '../types/database';
import { Download, Filter, Calendar, Tag, DollarSign } from 'lucide-react';

interface TransactionHistoryProps {
    profile: UserProfile;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    source: 'uploaded' | 'logged';
}

export default function TransactionHistory({ profile }: TransactionHistoryProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');

    useEffect(() => {
        loadTransactions();
    }, [days, profile.id]);

    const loadTransactions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/expense/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: profile.id, days })
            });

            const data = await res.json();
            setTransactions(data.transactions || []);

        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get unique categories
    const categories = Array.from(new Set(transactions.map(tx => tx.category)));

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
        if (filterSource !== 'all' && tx.source !== filterSource) return false;
        return true;
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getSourceBadge = (source: string) => {
        if (source === 'logged') {
            return (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Council Decision
                </span>
            );
        }
        return (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Uploaded
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Loading transactions...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Transaction History</h2>
                <div className="flex items-center gap-3">
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-black"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                        <option value={365}>Last Year</option>
                    </select>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl border border-gray-300 p-4">
                <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Category:</label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-1 bg-white border border-gray-300 rounded text-sm"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Source:</label>
                        <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="px-3 py-1 bg-white border border-gray-300 rounded text-sm"
                        >
                            <option value="all">All Sources</option>
                            <option value="uploaded">Uploaded</option>
                            <option value="logged">Council Decisions</option>
                        </select>
                    </div>
                    {(filterCategory !== 'all' || filterSource !== 'all') && (
                        <button
                            onClick={() => {
                                setFilterCategory('all');
                                setFilterSource('all');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-black">{filteredTransactions.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-black">
                        ₹{filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Average Transaction</p>
                    <p className="text-2xl font-bold text-black">
                        ₹{filteredTransactions.length > 0
                            ? (filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) / filteredTransactions.length).toFixed(2)
                            : '0.00'
                        }
                    </p>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-gray-50 rounded-xl border border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" />
                                        Category
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">
                                    <div className="flex items-center justify-end gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Amount
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-100 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {formatDate(tx.date)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-black">
                                            {tx.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-medium">
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {getSourceBadge(tx.source)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                                            ₹{tx.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No transactions found for the selected filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Export Option (Future Enhancement) */}
            <div className="flex justify-end">
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    Export CSV (Coming Soon)
                </button>
            </div>
        </div>
    );
}
