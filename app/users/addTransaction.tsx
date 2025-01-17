/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { db, auth } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, where, updateDoc, increment, orderBy } from "firebase/firestore";

// Firestore Integration Function
async function addDataToFirestore(name: string, email: string, message: string) {
  try {
    const docRef = await addDoc(collection(db, "message"), {
      name: name,
      email: email,
      message: message,
    });
    console.log("Document written with ID: ", docRef.id);
    return true;
  } catch (error) {
    console.error("Error adding document:", error);
    return false;
  }
}

// AddTransaction Component
export const AddTransaction = () => {
  const [formData, setFormData] = useState<{
    type: "income" | "expense" | "";
    amount: string;
    category: string;
    date: string;
    description: string;
    receipt: File | null;
  }>({
    type: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    receipt: null,
  });

  const [success, setSuccess] = useState(false);

  const categories: Record<"income" | "expense", string[]> = {
    income: ["Salary", "Savings", "Freelance", "Investment", "Gift", "Other Income"],
    expense: [
      "Food",
      "Transport",
      "Housing",
      "Utilities",
      "Healthcare",
      "Entertainment",
      "Shopping",
      "Other",
    ],
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!auth.currentUser) {
      console.error("No user logged in");
      return;
    }

    try {
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        userId: auth.currentUser.uid,
        date: new Date(formData.date),
        timestamp: new Date(),
        // Only add receipt if it exists
        ...(formData.receipt ? { receipt: formData.receipt.name } : {})
      };

      // Validation checks
      if (!transactionData.type || !['income', 'expense'].includes(transactionData.type)) {
        throw new Error('Invalid transaction type');
      }
      if (isNaN(transactionData.amount)) {
        throw new Error('Invalid amount');
      }
      if (!transactionData.category || !transactionData.description) {
        throw new Error('Missing required fields');
      }

      console.log("Transaction Data being sent:", transactionData);
      
      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      console.log("Transaction added with ID:", docRef.id);

      // Get month-year string for the transaction date
      const currentDate = new Date(formData.date);
      const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      // Prepare monthly totals data
      const monthlyData = {
        monthYear,
        userId: auth.currentUser.uid, // Add userId to monthly totals
        income: formData.type === "income" ? parseFloat(formData.amount) : 0,
        expenses: formData.type === "expense" ? parseFloat(formData.amount) : 0,
        savings: (formData.type === "income" && formData.category === "Savings") ? parseFloat(formData.amount) : 0,
        lastUpdated: new Date()
      };

      // Query existing monthly totals
      const monthlyTotalsRef = collection(db, "monthlyTotals");
      const q = query(
        monthlyTotalsRef,
        where("monthYear", "==", monthYear),
        where("userId", "==", auth.currentUser.uid),
        orderBy("monthYear"),
        orderBy("userId"),
        orderBy("__name__")
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new monthly totals record
        await addDoc(collection(db, "monthlyTotals"), monthlyData);
      } else {
        // Update existing monthly totals record
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          [formData.type === "income" ? "income" : "expenses"]: increment(parseFloat(formData.amount)),
          ...(formData.type === "income" && formData.category === "Savings" 
            ? { savings: increment(parseFloat(formData.amount)) }
            : {}),
          lastUpdated: new Date()
        });
      }

      console.log("Transaction added:", formData);
      setSuccess(true);

      // Reset form
      setFormData({
        type: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        receipt: null,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error:", error);
      throw error; // Re-throw to be caught by outer try-catch
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="p-4 flex items-center border-b border-gray-700">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-gray-700 rounded-full mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Add Transaction</h1>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Transaction Type</label>
            <div className="grid grid-cols-2 gap-4">
              {["income", "expense"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, type: type as "income" | "expense" })
                  }
                  className={`p-4 rounded-lg border ${
                    formData.type === type
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-gray-600 hover:border-gray-500"
                  } capitalize`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 p-3"
              placeholder="Enter amount"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 p-3"
              required
            >
              <option value="">Select Category</option>
              {(categories[formData.type as "income" | "expense"] || []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 p-3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full rounded-lg bg-gray-800 border border-gray-600 p-3"
              placeholder="Enter a description"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Receipt</label>
            <input
              type="file"
              onChange={(e) =>
                setFormData({ ...formData, receipt: e.target.files?.[0] || null })
              }
              className="w-full rounded-lg bg-gray-800 border border-gray-600 p-3"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Transaction</span>
          </button>
        </form>

        {success && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Transaction added successfully!
          </div>
        )}
      </main>
    </div>
  );
};
