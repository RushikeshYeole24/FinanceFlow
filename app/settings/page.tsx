"use client";
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { TelegramLink } from '../components/TelegramLink';

const SettingsPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section className="bg-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Account</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Email</p>
            <p>{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </section>

        <TelegramLink />
      </main>
    </div>
  );
};

export default SettingsPage; 