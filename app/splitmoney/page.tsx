/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";


import React, { useState } from 'react';
import axios from 'axios';

interface Contribution {
  name: string;
  amount: number;
}

interface Result {
  name: string;
  amount: number;
  difference: number;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

const Home: React.FC = () => {
  const [contributors, setContributors] = useState<Contribution[]>([{ name: '', amount: 0 }]);
  const [equalShare, setEqualShare] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addContributor = () => {
    setContributors([...contributors, { name: '', amount: 0 }]);
  };

  const handleChange = (index: number, field: keyof Contribution, value: string) => {
    const updatedContributors = [...contributors];
    if (field === 'amount') {
      // Ensure value is a valid number or fallback to 0
      updatedContributors[index][field] = value ? parseFloat(value) : 0;
    } else {
      updatedContributors[index][field] = value;
    }
    setContributors(updatedContributors);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await axios.post('/api/splitwise', { contributions: contributors });
    setEqualShare(response.data.equalShare);
    setTransactions(response.data.transactions);
  };

  return (
    <div className="container mx-auto p-8 min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6 text-white">Split Money</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {contributors.map((contributor, index) => (
          <div key={index} className="mb-4">
            <label className="mr-4 text-gray-300">
              Name:
              <input
                type="text"
                value={contributor.name}
                onChange={(e) => handleChange(index, 'name', e.target.value)}
                required
                className="ml-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-gray-300">
              Amount:
              <input
                type="number"
                value={contributor.amount || ''}  
                onChange={(e) => handleChange(index, 'amount', e.target.value)}
                required
                className="ml-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>
        ))}
        <div className="space-x-4">
          <button 
            type="button" 
            onClick={addContributor} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200">
            Add Contributor
          </button>
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200">
            Calculate
          </button>
        </div>
      </form>

      {equalShare !== null && transactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Total per person: {equalShare.toFixed(2)}</h2>
          <div className="mt-4">
            {transactions.map((transaction, index) => (
              <p key={index} className="mb-2 text-gray-300">
                {transaction.from} has to pay {transaction.amount.toFixed(2)} to {transaction.to}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
