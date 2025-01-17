import { addDoc, collection } from 'firebase/firestore';
import { db } from '../app/users/firebaseConfig';

export const handleTelegramTransaction = async (userId: string, text: string) => {
  try {
    const [type, amount, category, ...description] = text.split(' ');
    const transaction = {
      userId,
      type: type.toLowerCase(),
      amount: parseFloat(amount),
      category,
      description: description.join(' '),
      timestamp: new Date()
    };
    
    await addDoc(collection(db, 'telegram_transactions'), transaction);
    return 'Transaction recorded successfully!';
  } catch (error) {
    console.error('Error handling transaction:', error);
    return 'Failed to record transaction. Please try again.';
  }
}; 