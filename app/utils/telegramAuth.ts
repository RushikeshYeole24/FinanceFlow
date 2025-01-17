import { db } from '../users/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const linkTelegramAccount = async (userId: string, telegramId: string, telegramUsername: string) => {
  try {
    // Store the telegram linking information
    await setDoc(doc(db, "userTelegramLinks", userId), {
      telegramId,
      telegramUsername,
      linkedAt: new Date(),
      userId
    });

    return true;
  } catch (error) {
    console.error("Error linking Telegram account:", error);
    return false;
  }
}; 