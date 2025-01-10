/* eslint-disable @typescript-eslint/no-unused-vars */
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { auth, db } from '../users/firebaseConfig';

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
}

interface TransactionData {
  type: string;
  amount: number;
}

const TransactionForm = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('');

  // Fetch goals when component mounts
  useEffect(() => {
    const fetchGoals = async () => {
      const userId = auth.currentUser?.uid;
      const q = query(
        collection(db, "goals"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      setGoals(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Goal)));
    };

    fetchGoals();
  }, []);

  const handleTransactionSubmit = async (transactionData: TransactionData) => {
    // Your existing transaction submission logic
    
    // If a goal is selected, update its current amount
    if (selectedGoal && transactionData.type === 'income') {
      const goalRef = doc(db, 'goals', selectedGoal);
      const goal = goals.find(g => g.id === selectedGoal);
      if (goal) {
        await updateDoc(goalRef, {
          current: goal.current + Number(transactionData.amount)
        });
      }
    }
  };

  return (
    <form>
      {/* Your existing transaction form fields */}
      
      <select
        value={selectedGoal}
        onChange={(e) => setSelectedGoal(e.target.value)}
        className="form-select"
      >
        <option value="">Select a goal (optional)</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title} - ${goal.current}/${goal.target}
          </option>
        ))}
      </select>
      
      {/* Rest of your form */}
    </form>
  );
}; 