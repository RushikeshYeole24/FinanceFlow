"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Wallet,
  TrendingUp,
  Bell,
  Settings,
  Target,
  CreditCard,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./users/firebaseConfig";
import { GoalsProgress } from './components/GoalsProgress';

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
};

interface MonthlySavings {
  monthYear: string;
  total: number;
  lastUpdated: Date;
}

const HomePage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonthSavings, setCurrentMonthSavings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const quickActions = [
    { icon: <Wallet className="h-6 w-6" />, title: "Add Transaction", link: "/users" },
    { icon: <BarChart className="h-6 w-6" />, title: "Set Goal", link: "/goal" },
    { icon: <Target className="h-6 w-6" />, title: "SplitMoney", link: "/splitmoney" },
    { icon: <CreditCard className="h-6 w-6" />, title: "Play Game", link: "/accounts" },
  ];

  const insights = [
    { title: "Monthly Savings", value: "+$2,450", trend: "+15%", positive: true },
    { title: "Budget Status", value: "$3,200 left", trend: "70%", positive: true },
    { title: "Biggest Expense", value: "Housing", trend: "-$1,500", positive: false },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "transactions"));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Transaction, "id">),
      }));
      setTransactions(data);
    };

    fetchData();
  }, []);

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

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-4">
          <h2 className="text-4xl font-bold">Welcome back!</h2>
          <p className="text-gray-400">Your financial wellness score is 85/100</p>
          <div className="h-2 max-w-md mx-auto bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link legacyBehavior href={action.link} key={index}>
              <a
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors flex flex-col items-center justify-center space-y-2 group"
                title={action.title}
              >
                {action.icon}
                <span className="text-sm">{action.title}</span>
                <span className="text-gray-400 text-xs group-hover:opacity-100 opacity-0 transition-opacity">
                  {action.title}
                </span>
              </a>
            </Link>
          ))}
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm">{insight.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold">{insight.value}</span>
                <span
                  className={`flex items-center ${
                    insight.positive ? "text-green-400" : "text-red-400"
                  }`}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {insight.trend}
                </span>
              </div>
            </div>
          ))}
        </section>

        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-4 flex items-center justify-between border-b border-gray-700">
            <h2 className="font-semibold text-lg">Recent Activity</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700"
                >
                  <div>
                    <p className="font-medium">{transaction.title}</p>
                    <p className="text-sm text-gray-400">{transaction.category}</p>
                    <p className="text-xs text-gray-500">Amount recorded recently</p>
                  </div>
                  <span
                    className={
                      transaction.amount > 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-800 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Monthly Savings</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-700 h-8 rounded"></div>
          ) : (
            <div className="text-2xl font-bold text-green-500">
              ${currentMonthSavings.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          )}
          <p className="text-sm text-gray-400 mt-1">
            Total savings for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="mt-6">
          <GoalsProgress />
        </div>
      </main>
    </div>
  );
};

export default HomePage;
