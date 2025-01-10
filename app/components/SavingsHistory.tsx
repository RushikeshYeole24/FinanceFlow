"use client";
import { useEffect, useState } from 'react';
import { db } from '../users/firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

interface MonthlySavings {
  monthYear: string;
  total: number;
  lastUpdated: Date;
}

export const SavingsHistory = () => {
  const [savingsHistory, setSavingsHistory] = useState<MonthlySavings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavingsHistory = async () => {
      try {
        const savingsRef = collection(db, "monthlySavings");
        const q = query(savingsRef, orderBy("monthYear", "desc"));
        const querySnapshot = await getDocs(q);
        
        const history = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated.toDate()
        })) as MonthlySavings[];
        
        setSavingsHistory(history);
      } catch (error) {
        console.error("Error fetching savings history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavingsHistory();
  }, []);

  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Savings History</h2>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-700 h-12 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {savingsHistory.map((savings) => (
            <div
              key={savings.monthYear}
              className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
            >
              <span className="text-gray-300">
                {new Date(savings.monthYear + '-01').toLocaleString('default', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <span className="text-green-500 font-bold">
                ${savings.total.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 