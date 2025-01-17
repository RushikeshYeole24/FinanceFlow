/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { FinanceAgent } from '../services/financeAgent';
import { MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { Transaction } from 'firebase/firestore';

interface AIFinanceManagerProps {
  transactions: Transaction[];
  currentMonthSavings: number;
  goals: any[]; // Replace with your goals type
}

export const AIFinanceManager: React.FC<AIFinanceManagerProps> = ({
  transactions,
  currentMonthSavings,
  goals,
}) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyzeFinances = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const financeAgent = new FinanceAgent();
        const monthlyIncome = 5000; // Replace with actual income data

        const result = await financeAgent.analyzeFinances({
          income: monthlyIncome,
          expenses: transactions,
          savings: currentMonthSavings,
          goals: goals,
        });

        // Parse and organize AI responses
        setInsights(result.insights || []);
        setRecommendations(result.recommendations || []);
      } catch (err) {
        setError('Failed to analyze finances. Please try again later.');
        console.error('AI Analysis Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (transactions.length > 0) {
      analyzeFinances();
    }
  }, [transactions, currentMonthSavings, goals]);

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          AI Finance Manager
        </h2>
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 rounded-full border-t-transparent"></div>
            Analyzing...
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Financial Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-gray-700/50 rounded-lg text-sm"
              >
                {insight}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-400" />
            Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="p-4 bg-gray-700/50 rounded-lg text-sm"
              >
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button 
        className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        onClick={() => setIsLoading(true)}
        disabled={isLoading}
      >
        Refresh Analysis
      </button>
    </section>
  );
}; 