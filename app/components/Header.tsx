"use client";
import { Bell, Settings } from "lucide-react";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
        FinanceFlow
      </h1>
      <div className="flex items-center space-x-4">
        <button className="p-2 hover:bg-gray-700 rounded-full relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <Link href="/settings">
          <button className="p-2 hover:bg-gray-700 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </Link>
      </div>
    </header>
  );
}; 