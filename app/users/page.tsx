"use client";
import React from "react";
import { AddTransaction } from "./addTransaction";

const Page = () => {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Transactions</h1>
      <AddTransaction />
    </div>
  );
};

export default Page;
