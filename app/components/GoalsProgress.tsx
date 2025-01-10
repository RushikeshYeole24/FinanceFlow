import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../users/firebaseConfig';
import { ProgressBar } from '../goal/setGoal';

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
}

export const GoalsProgress = () => {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const goalsRef = collection(db, "goals");

    const unsubscribe = onSnapshot(goalsRef, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Goal));
      setGoals(goalsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Savings Goals Progress</h2>
      {goals.length === 0 ? (
        <p className="text-gray-500">No goals set yet.</p>
      ) : (
        goals.map((goal) => (
          <div key={goal.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>{goal.title}</span>
              <span>${goal.current} / ${goal.target}</span>
            </div>
            <ProgressBar value={(goal.current / goal.target) * 100} />
          </div>
        ))
      )}
    </div>
  );
}; 