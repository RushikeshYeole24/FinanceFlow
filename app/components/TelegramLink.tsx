/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { triggerMigration } from '../api/telegram/migrate/trigger';
import { setDoc, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

// Debug logging helper
const debugLog = (...args: unknown[]) => {
  console.log('[TelegramLink]:', ...args);
};

// Define a User type (if not already defined)
interface User {
  uid: string;
  // Add other user properties as needed
}

export function TelegramLink() {
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    debugLog('Component mounted');
    return () => {
      debugLog('Component unmounted');
    };
  }, []);

  useEffect(() => {
    debugLog('Migration status changed:', migrationStatus);
  }, [migrationStatus]);

  const handleMigration = async () => {
    debugLog('Starting migration');
    try {
      setMigrating(true);
      setError(null);
      setMigrationStatus('idle');
      const result = await triggerMigration();
      if (result.success) {
        setMigrationStatus('success');
        // Force a page refresh to show updated transactions
        window.location.reload();
      } else {
        throw new Error(result.message || 'Migration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to migrate transactions');
      setMigrationStatus('error');
    } finally {
      setMigrating(false);
    }
  };  

  const handleLinkTelegram = async () => {
    if (!user || !telegramUsername) return;

    try {
      setLoading(true);
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Store with Firebase userId
      await setDoc(doc(db, "userTelegramLinks", user.uid), {
        userId: user.uid,  // Store Firebase user ID
        telegramUsername: telegramUsername.replace('@', ''),
        verificationCode,
        verified: false,
        createdAt: new Date(),
        telegramId: null // Will be filled when verified
      });
      
      alert(`Please send this verification code to our Telegram bot: ${verificationCode}`);
    } catch (error) {
      console.error('Linking error:', error);
      setError('Failed to link account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Find and delete the link document
      const linksRef = collection(db, "userTelegramLinks");
      const q = query(linksRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const linkDoc = querySnapshot.docs[0];
        await deleteDoc(doc(db, "userTelegramLinks", linkDoc.id));
      }

      setIsLinked(false);
      setTelegramUsername('');
      alert('Telegram account unlinked successfully');
    } catch (error) {
      console.error('Error unlinking:', error);
      setError('Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Telegram Integration</h2>
        <button
          onClick={handleMigration}
          disabled={migrating}
          className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
            migrationStatus === 'success' 
              ? 'bg-green-500 hover:bg-green-600' 
              : migrationStatus === 'error'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {migrating ? 'Migrating...' : migrationStatus === 'success' ? 'Updated Successfully' : 'Update Transactions'}
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      {migrationStatus === 'success' && (
        <div className="text-green-500 text-sm">Transactions updated successfully!</div>
      )}
      <p className="text-gray-400">
        Link your Telegram account to track expenses on the go. Send transactions in the format:
        title, category, amount, type
      </p>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Link Telegram Account</h2>
        
        {!isLinked ? (
          <div className="space-y-4">
            <input
              type="text"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="Enter Telegram username"
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
            <button
              onClick={handleLinkTelegram}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Linking...' : 'Link Telegram'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-400">✓ Telegram account linked</p>
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Unlinking...' : 'Unlink Telegram'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}