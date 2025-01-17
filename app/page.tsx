/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Wallet,
  Bell,
  Settings,
  Target,
  CreditCard,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./users/firebaseConfig";
import { GoalsProgress } from './components/GoalsProgress';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAuth } from '../app/context/AuthContext';

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

const HomePage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonthSavings, setCurrentMonthSavings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<{ name: string; value: number }[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const quickActions = [
    { icon: <Wallet className="h-6 w-6" />, title: "Add Transaction", link: "/users" },
    { icon: <BarChart className="h-6 w-6" />, title: "Set Goal", link: "/goal" },
    { icon: <Target className="h-6 w-6" />, title: "SplitMoney", link: "/splitmoney" },
    { icon: <CreditCard className="h-6 w-6" />, title: "Play Game", link: "/accounts" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both regular and telegram transactions
        const regularTransactionsRef = collection(db, "transactions");
        const telegramTransactionsRef = collection(db, "telegram_transactions");

        // Get both transaction types
        const [regularSnapshot, telegramSnapshot] = await Promise.all([
          getDocs(query(regularTransactionsRef, where("userId", "==", user?.uid))),
          getDocs(telegramTransactionsRef) // Fetch all telegram transactions for now
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

        // Map telegram transactions with the correct structure
        const telegramData = telegramSnapshot.docs.map(doc => ({
          id: `telegram_${doc.id}`,
          title: doc.data().title || 'Telegram Transaction',
          category: doc.data().category || 'Other',
          amount: Number(doc.data().amount),
          type: doc.data().type as 'expense' | 'income',
          source: 'telegram' as const,
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));

        console.log("Telegram transactions:", telegramData); // Debug log

        // Combine and sort all transactions
        const allTransactions = [...regularData, ...telegramData].sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );

        setTransactions(allTransactions);
        console.log("All transactions:", allTransactions);

        // Calculate category totals
        const totals = allTransactions.reduce((acc, transaction) => {
          if (transaction.type === 'expense') {
            const amount = Number(transaction.amount);
            if (!isNaN(amount)) {
              acc[transaction.category] = (acc[transaction.category] || 0) + amount;
            }
          }
          return acc;
        }, {} as Record<string, number>);

        const formattedTotals = Object.entries(totals).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2))
        }));

        setCategoryTotals(formattedTotals);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
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

  // Add dashboard summary cards
  const summaryCards = [
    { title: "Total Balance", amount: "$12,345.67", trend: "+2.5%", color: "blue" },
    { title: "Monthly Spending", amount: "$2,456.78", trend: "-1.2%", color: "red" },
    { title: "Monthly Savings", amount: `$${currentMonthSavings.toFixed(2)}`, trend: "+5.3%", color: "green" },
    { title: "Investments", amount: "$5,678.90", trend: "+3.7%", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          FinanceFlow
        </h1>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-700 rounded-full relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-700 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        {/* Enhanced welcome section */}
        <section className="text-center space-y-4 bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Welcome back, User!
          </h2>
          <p className="text-gray-400">Your financial wellness score is 85/100</p>
          <div className="h-3 max-w-md mx-auto bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full w-4/5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full 
                         transition-all duration-1000 ease-in-out"
            ></div>
          </div>
        </section>

        {/* Dashboard Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <div 
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:bg-gray-700/50 
                         transition-all duration-300 ease-in-out transform hover:-translate-y-1"
            >
              <h3 className="text-gray-400 text-sm">{card.title}</h3>
              <p className="text-2xl font-bold mt-2">{card.amount}</p>
              <span className={`text-sm text-${card.color}-400`}>{card.trend}</span>
            </div>
          ))}
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