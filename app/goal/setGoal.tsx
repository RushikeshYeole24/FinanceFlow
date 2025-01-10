/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PlusCircle, Trash2, Target, Wallet, BookOpen, Coffee, ShoppingBag } from "lucide-react";
import { addDoc, collection, getDocs, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../users/firebaseConfig";
import { auth } from "../users/firebaseConfig";

interface ProgressBarProps {
  value: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  const progressColor =
    value < 50 ? "bg-red-600" : value < 75 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`${progressColor} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>{children}</div>
);

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  category: string;
  deadline: string;
  icon: React.JSX.Element;
}

const FinancialGoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);

  const [newGoal, setNewGoal] = useState({
    title: "",
    target: "",
    category: "savings",
    deadline: "",
  });

  const categories = [
    { id: "savings", name: "Savings", icon: <Wallet className="h-4 w-4" /> },
    { id: "education", name: "Education", icon: <BookOpen className="h-4 w-4" /> },
    { id: "leisure", name: "Leisure", icon: <Coffee className="h-4 w-4" /> },
    { id: "shopping", name: "Shopping", icon: <ShoppingBag className="h-4 w-4" /> },
  ];

  // Fetch goals from Firebase on component mount
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "goals"), (snapshot) => {
      const fetchedGoals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        icon: categories.find((cat) => cat.id === doc.data().category)?.icon ||
          <Wallet className="h-5 w-5" />,
      })) as Goal[];
      setGoals(fetchedGoals);
    });

    return () => unsubscribe();
  }, [categories]);

  const handleAddGoal = useCallback(async () => {
    if (!newGoal.title || !newGoal.target || isNaN(Number(newGoal.target))) {
      alert("Please provide valid goal details.");
      return;
    }
  
    try {
      // Save to Firestore with a unique ID
      const docRef = await addDoc(collection(db, "goals"), {
        title: newGoal.title,
        target: Number(newGoal.target),
        current: 0,
        category: newGoal.category,
        deadline: newGoal.deadline || "No deadline specified",
        createdAt: new Date(),
      });
  
      console.log("Document written with ID: ", docRef.id);
  
      // Update local state with Firestore ID
      setGoals((prevGoals) => [
        ...prevGoals,
        {
          id: docRef.id,
          title: newGoal.title,
          target: Number(newGoal.target),
          current: 0,
          category: newGoal.category,
          deadline: newGoal.deadline || "No deadline specified",
          icon: categories.find((cat) => cat.id === newGoal.category)?.icon ||
            <Wallet className="h-5 w-5" />,
        } as Goal,
      ]);
  
      // Reset the new goal input fields
      setNewGoal({ title: "", target: "", category: "savings", deadline: "" });
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("There was an error adding the goal.");
    }
  }, [newGoal, categories]);

  // Add function to update goal progress
  const handleUpdateProgress = async (goalId: string, newAmount: number) => {
    try {
      const goalRef = doc(db, "goals", goalId);
      await updateDoc(goalRef, {
        current: newAmount
      });
    } catch (error) {
      console.error("Error updating progress: ", error);
      alert("Failed to update progress");
    }
  };

  // Modify delete function to remove from Firebase
  const handleDeleteGoal = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "goals", id));
    } catch (error) {
      console.error("Error deleting goal: ", error);
      alert("Failed to delete goal");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="p-4 flex items-center border-b border-gray-700">
        <h1 className="text-3xl font-bold">Financial Goals</h1>
        <Target className="h-8 w-8 text-blue-500" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Tips Alert */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h4 className="text-blue-800 font-bold">Smart Saving Tips 💡</h4>
          <p className="text-blue-700">
            Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt
            repayment.
          </p>
        </div>

        {/* Add New Goal */}
        <div className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Add New Goal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              className="w-full p-3 border border-gray-600 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Goal Title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              aria-label="Goal Title"
            />
            <input
              className="w-full p-3 border border-gray-600 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              placeholder="Target Amount ($)"
              value={newGoal.target}
              onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
              aria-label="Target Amount"
            />
            <select
              className="w-full p-3 border border-gray-600 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newGoal.category}
              onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
              aria-label="Category"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              className="w-full p-3 border border-gray-600 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="date"
              value={newGoal.deadline}
              onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              aria-label="Deadline"
            />
          </div>
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
            onClick={handleAddGoal}
          >
            <PlusCircle className="h-4 w-4" />
            Add Goal
          </button>
        </div>

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-gray-800 p-6 rounded-lg shadow-lg relative">
              <button
                className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded-full"
                onClick={() => handleDeleteGoal(goal.id)}
                aria-label="Delete Goal"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">{goal.icon}</div>
                <div>
                  <h3 className="font-bold">{goal.title}</h3>
                  <p className="text-sm text-gray-500">
                    Target Date:{" "}
                    {goal.deadline !== "No deadline specified"
                      ? new Date(goal.deadline).toLocaleDateString()
                      : goal.deadline}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <ProgressBar value={(goal.current / goal.target) * 100} />
                <div className="flex justify-between text-sm">
                  <span>${goal.current}</span>
                  <span className="text-gray-500">of ${goal.target}</span>
                </div>
                <input
                  type="number"
                  placeholder="Update progress"
                  className="w-full p-2 mt-2 border border-gray-600 bg-gray-700 rounded-lg text-white"
                  onChange={(e) => {
                    const newAmount = Number(e.target.value);
                    if (!isNaN(newAmount)) {
                      handleUpdateProgress(goal.id, newAmount);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FinancialGoalsPage;
