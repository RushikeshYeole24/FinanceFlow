/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Wallet,
  Bell,
  Settings,
  Target,
  CreditCard,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Calendar,
  LineChart,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./users/firebaseConfig";
import { GoalsProgress } from './components/GoalsProgress';
import axios from 'axios';
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Bar,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from '../app/context/AuthContext';
import { TelegramLink } from './components/TelegramLink';

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  source: 'manual' | 'telegram';
  timestamp: Date;
};

interface MonthlySavings {
  monthYear: string;
  total: number;
  lastUpdated: Date;
}

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
};

type TimeRange = 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'allTime';
type ChartData = {
  date: string;
  savings: number;
  expenses: number;
  balance: number;
};

// Add the FinanceFlowLogo component from auth page
const FinanceFlowLogo = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-8 h-8 text-white"
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z" />
            <path d="M16 10H20V14H16C14.8954 14 14 13.1046 14 12C14 10.8954 14.8954 10 16 10Z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full" />
        </div>
      </div>
      <span className="text-2xl font-bold text-white">
        Finance<span className="text-red-500">Flow</span>
      </span>
    </div>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonthSavings, setCurrentMonthSavings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<{ name: string; value: number }[]>([]);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [monthlySpendingTrend, setMonthlySpendingTrend] = useState("0%");
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const quickActions = [
    { icon: <Wallet className="h-6 w-6" />, title: "Add Transaction", link: "/users" },
    { icon: <BarChart className="h-6 w-6" />, title: "Set Goal", link: "/goal" },
    { icon: <Target className="h-6 w-6" />, title: "SplitMoney", link: "/splitmoney" },
    { icon: <CreditCard className="h-6 w-6" />, title: "Play Game", link: "/accounts" },
  ];

  const calculateChartData = useCallback(() => {
    if (!transactions.length) return [];

    const endDate = new Date();
    let startDate = new Date();

    // Set start date based on selected time range
    switch (timeRange) {
      case 'thisMonth':
        startDate.setDate(1);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        endDate.setDate(0); // Last day of previous month
        break;
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'allTime':
        startDate = new Date(Math.min(...transactions.map(t => new Date(t.timestamp).getTime())));
        break;
    }

    const buckets = new Map<string, { savings: number; expenses: number; balance: number }>();
    const dateFormat = timeRange === 'thisMonth' || timeRange === 'lastMonth' 
      ? 'MM/dd' 
      : 'MM/yyyy';

    // Initialize buckets
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const key = currentDate.toLocaleDateString('en-US', {
        month: '2-digit',
        ...(dateFormat === 'MM/dd' ? { day: '2-digit' } : { year: 'numeric' })
      });
      buckets.set(key, { savings: 0, expenses: 0, balance: 0 });
      
      if (dateFormat === 'MM/dd') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Fill buckets with transaction data
    transactions.forEach(transaction => {
      const date = new Date(transaction.timestamp);
      if (date >= startDate && date <= endDate) {
        const key = date.toLocaleDateString('en-US', {
          month: '2-digit',
          ...(dateFormat === 'MM/dd' ? { day: '2-digit' } : { year: 'numeric' })
        });
        
        const bucket = buckets.get(key) || { savings: 0, expenses: 0, balance: 0 };
        
        if (transaction.category === 'Savings') {
          bucket.savings += transaction.amount;
        } else if (transaction.type === 'expense') {
          bucket.expenses += transaction.amount;
        }
        
        bucket.balance = bucket.savings - bucket.expenses;
        buckets.set(key, bucket);
      }
    });

    return Array.from(buckets.entries()).map(([date, data]) => ({
      date,
      ...data
    }));
  }, [transactions, timeRange]);

  useEffect(() => {
    const data = calculateChartData();
    setChartData(data);
  }, [calculateChartData, timeRange]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        console.log("No user logged in");
        return;
      }

      try {
        // First get the user's telegram link
        const telegramLinkRef = collection(db, "userTelegramLinks");
        const telegramLinkSnapshot = await getDocs(
          query(telegramLinkRef, where("userId", "==", user.uid))
        );
        
        const telegramId = telegramLinkSnapshot.docs[0]?.data()?.telegramId;
        console.log("Found Telegram ID:", telegramId);

        // Fetch both types of transactions
        const regularTransactionsRef = collection(db, "transactions");
        const telegramTransactionsRef = collection(db, "telegram_transactions");

        const [regularSnapshot, telegramSnapshot] = await Promise.all([
          getDocs(query(regularTransactionsRef, where("userId", "==", user.uid))),
          getDocs(query(telegramTransactionsRef, where("userId", "==", Number(telegramId))))
        ]);

        // Map regular transactions
        const regularData = regularSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().description || doc.data().title || '',
          category: doc.data().category || 'Other',
          amount: Number(doc.data().amount),
          type: doc.data().type as 'expense' | 'income',
          source: 'manual' as const,
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));

        // Map telegram transactions
        const telegramData = telegramSnapshot.docs.map(doc => ({
          id: `telegram_${doc.id}`,
          title: doc.data().title || '',
          category: doc.data().category || 'Other',
          amount: Number(doc.data().amount),
          type: doc.data().type as 'expense' | 'income',
          source: 'telegram' as const,
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));

        console.log("Regular transactions:", regularData.length);
        console.log("Telegram transactions:", telegramData.length);

        // Combine and sort all transactions
        const allTransactions = [...regularData, ...telegramData].sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );

        setTransactions(allTransactions);
        console.log(`Fetched ${allTransactions.length} total transactions`);

        // Calculate category totals from both sources
        const totals = allTransactions.reduce((acc, transaction) => {
          if (transaction.type === 'expense') {
            const amount = Number(transaction.amount);
            if (!isNaN(amount)) {
              const category = transaction.category || 'Other';
              acc[category] = (acc[category] || 0) + amount;
            }
          }
          return acc;
        }, {} as Record<string, number>);

        const formattedTotals = Object.entries(totals).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2))
        }));

        console.log("Category totals:", formattedTotals);
        setCategoryTotals(formattedTotals);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      setTransactions([]);
      setCategoryTotals([]);
    }
  }, [user]);

  useEffect(() => {
    const fetchMonthlySavings = async () => {
      try {
        const currentDate = new Date();
        const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        const savingsRef = collection(db, "monthlySavings");
        const q = query(
          savingsRef,
          where("monthYear", "==", monthYear)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const savingsData = querySnapshot.docs[0].data() as MonthlySavings;
          setCurrentMonthSavings(savingsData.total);
        }
      } catch (error) {
        console.error("Error fetching monthly savings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlySavings();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch news for some major stock symbols
        const response = await axios.get('/api/news'); // We'll create this API route
        setNews(response.data);
      } catch (error) {
        console.error("Error fetching news:", error);
        // Fallback to previous mock data if API fails
        setNews([
          {
            title: "Market Update Unavailable",
            description: "Please try again later",
            url: "#",
            source: "System",
            publishedAt: new Date().toLocaleDateString()
          }
        ]);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Update monthly spending calculations
  useEffect(() => {
    if (transactions.length > 0) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Calculate current month's spending (both manual and telegram)
      const currentMonthExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        return t.type === 'expense' &&
               transactionDate.getMonth() === currentMonth &&
               transactionDate.getFullYear() === currentYear;
      }).reduce((sum, t) => sum + t.amount, 0);

      // Calculate last month's spending
      const lastMonthExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        return t.type === 'expense' &&
               transactionDate.getMonth() === lastMonth &&
               transactionDate.getFullYear() === lastMonthYear;
      }).reduce((sum, t) => sum + t.amount, 0);

      setMonthlySpending(currentMonthExpenses);

      // Calculate spending trend
      if (lastMonthExpenses > 0) {
        const trend = ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
        setMonthlySpendingTrend(`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`);
      }
    }
  }, [transactions]);

  // Add dashboard summary cards
  const summaryCards = [
    
    { title: "Monthly Spending", amount: "$2,456.78", trend: "-1.2%", color: "red" },
    { title: "Monthly Savings", amount: `$${currentMonthSavings.toFixed(2)}`, trend: "+5.3%", color: "green" },
    
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative p-4 flex justify-between items-center backdrop-blur-sm border-b border-gray-800">
        <FinanceFlowLogo />
        <div className="flex items-center space-x-4">
          <Link href="/settings" className="p-2 hover:bg-gray-800/50 rounded-full transition-colors">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl relative">
        {/* Welcome section with updated styling */}
        <section className="text-center space-y-4 bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700">
          <h2 className="text-3xl font-bold text-white">
            Welcome back, {user?.email?.split('@')[0] || 'User'}!
          </h2>
          <p className="text-gray-400">Your Personal Finance Assistant!</p>
          <div className="h-3 max-w-md mx-auto bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-gradient-to-r from-red-500 to-blue-500 rounded-full 
                         transition-all duration-1000 ease-in-out"></div>
          </div>
        </section>

        {/* Update summary cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 
                       hover:bg-gray-700/50 transition-all duration-300 ease-in-out">
            <h3 className="text-gray-400 text-sm">Monthly Spending</h3>
            <p className="text-2xl font-bold mt-2">${monthlySpending.toFixed(2)}</p>
            <span className={`text-sm ${monthlySpendingTrend.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>
              {monthlySpendingTrend} from last month
            </span>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 
                       hover:bg-gray-700/50 transition-all duration-300 ease-in-out">
            <h3 className="text-gray-400 text-sm">Monthly Savings</h3>
            <p className="text-2xl font-bold mt-2">${currentMonthSavings.toFixed(2)}</p>
            <span className="text-sm text-green-400">+5.3%</span>
          </div>
        </section>

        {/* Telegram Link Section */}
        <section className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Telegram Integration</h2>
          </div>
          <TelegramLink />
        </section>

        {/* Quick Actions with enhanced styling */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link href={action.link} key={index}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:bg-gray-700/50 
                            transition-all duration-300 ease-in-out transform hover:-translate-y-1
                            flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  {action.icon}
                </div>
                <span className="text-sm font-medium">{action.title}</span>
              </div>
            </Link>
          ))}
        </section>

        {/* Financial Visualizations */}
        <section className="space-y-6">
          {/* Time Range Selector */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Range
              </h3>
              <div className="flex gap-2">
                {[
                  { value: 'thisMonth', label: 'This Month' },
                  { value: 'lastMonth', label: 'Last Month' },
                  { value: '3months', label: '3 Months' },
                  { value: '6months', label: '6 Months' },
                  { value: 'year', label: 'Year' },
                  { value: 'allTime', label: 'All Time' },
                ].map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value as TimeRange)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      timeRange === range.value
                        ? 'bg-gradient-to-r from-red-500 to-blue-500 text-white'
                        : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                Savings vs Expenses
              </h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                      }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Bar dataKey="savings" name="Savings" fill="#10B981" />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LineChartIcon className="h-5 w-5" />
                Balance Trend
              </h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                      }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke="#60A5FA"
                      strokeWidth={2}
                      dot={{ fill: '#60A5FA' }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Two-column layout for charts and news */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses Chart */}
          <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Expenses by Category</h2>
            {categoryTotals.length > 0 ? (
              <div className="h-[300px] w-full border border-gray-700">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryTotals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No expense data available
              </div>
            )}
          </section>

          {/* News Section with enhanced styling */}
          <section className="bg-gray-800 border border-gray-700 rounded-xl">
            <div className="p-6 border-b border-gray-700">
              <h2 className="font-semibold text-lg">Recent Finance News</h2>
            </div>
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {news.map((article, index) => (
                <div key={index} 
                     className="p-4 hover:bg-gray-700/50 rounded-xl transition-colors duration-200">
                  <a href={article.url} target="_blank" rel="noopener noreferrer"
                     className="block space-y-2">
                    <h3 className="font-medium hover:text-blue-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{article.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>{article.publishedAt}</span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recent Activity with enhanced styling */}
        <section className="bg-gray-800 border border-gray-700 rounded-xl">
          <div className="p-4 flex items-center justify-between border-b border-gray-700">
            <h2 className="font-semibold text-lg">Recent Activity</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700"
                >
                  <div>
                    <p className="font-medium">{transaction.title}</p>
                    <p className="text-sm text-gray-400">{transaction.category}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.timestamp instanceof Date 
                        ? transaction.timestamp.toLocaleDateString() 
                        : 'No date available'}
                      {' • '}
                      {transaction.source}
                    </p>
                  </div>
                  <span
                    className={
                      transaction.type === 'income'
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {transaction.type === 'income' ? "+" : "-"}$
                    {Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Goals Progress */}
        <div className="mt-6">
          <GoalsProgress />
        </div>
      </main>
    </div>
  );
};

export default HomePage;