import { db } from '../../users/firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

interface TelegramTransaction {
  title?: string;
  description?: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  userId: string;
  timestamp: Date;
  source: 'telegram';
  metadata?: {
    chatId: number;
    username: string;
    processedAt: string;
    linkDocId: string;
    validatedAt: string;
  };
}

type FirestoreUpdates = {
  [key: string]: string | number | boolean | null | undefined;
};

export async function migrateTelegramTransactions() {
  const telegramTransactionsRef = collection(db, 'telegram_transactions');
  const snapshot = await getDocs(telegramTransactionsRef);

  console.log(`Found ${snapshot.docs.length} telegram transactions to check`);

  for (const doc_ of snapshot.docs) {
    const data = doc_.data() as TelegramTransaction;
    const updates: FirestoreUpdates = {};

    // Add description field if missing
    if (!data.description && data.title) {
      updates['description'] = data.title;
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      console.log(`Updating document ${doc_.id} with:`, updates);
      const docRef = doc(db, 'telegram_transactions', doc_.id);
      await updateDoc(docRef, updates);
    }
  }

  console.log('Migration completed');
}