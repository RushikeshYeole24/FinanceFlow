import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../users/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export function TelegramLink() {
  const { user } = useAuth();
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLinkTelegram = async () => {
    if (!user || !telegramId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Store the Telegram ID in Firestore
      await setDoc(doc(db, "userTelegramLinks", user.uid), {
        userId: user.uid,
        telegramId: telegramId,
        createdAt: new Date()
      });

      setSuccess(true);
      alert('Telegram ID linked successfully! You can now use the Telegram bot.');
    } catch (err) {
      setError('Failed to link Telegram ID. Please try again.');
      console.error('Error linking Telegram:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400">
        Link your Telegram account to track expenses via our Telegram bot. 
        To find your Telegram ID:
        1. Open Telegram
        2. Message @userinfobot
        3. Copy your ID number
      </p>
      
      <div className="flex gap-4">
        <input
          type="text"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          placeholder="Enter your Telegram ID"
          className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleLinkTelegram}
          disabled={loading || !telegramId}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Linking...' : 'Link Telegram'}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {success && (
        <p className="text-green-500 text-sm">✓ Telegram account linked successfully!</p>
      )}
    </div>
  );
}