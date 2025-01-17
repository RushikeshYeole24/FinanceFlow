/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from '../app/users/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

export const handleStart = async (telegramId: string, username: string) => {
  return `Welcome to FinanceFlow Bot! 
To link your account, please:
1. Go to the FinanceFlow web app
2. Navigate to Settings
3. Click "Link Telegram Account"
4. Enter your Telegram username: @${username}
5. Send the verification code here`;
};

export const handleVerification = async (telegramId: string, code: string, username: string) => {
  try {
    // Find the pending link with this verification code
    const linksRef = collection(db, "userTelegramLinks");
    const q = query(linksRef, where("verificationCode", "==", code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return "Invalid verification code. Please try again.";
    }

    const linkDoc = querySnapshot.docs[0];
    const userId = linkDoc.id;

    // Update the document with the Telegram ID
    await updateDoc(doc(db, "userTelegramLinks", userId), {
      telegramId,
      telegramUsername: username,
      verificationCode: null,
      verified: true,
      verifiedAt: new Date()
    });

    return "✅ Successfully linked your Telegram account with FinanceFlow!";
  } catch (error) {
    console.error("Error verifying Telegram account:", error);
    return "❌ Error verifying your account. Please try again.";
  }
};

export const handleTransaction = async (telegramId: string, message: string) => {
  // Example format: /expense 50 food Lunch at restaurant
  const parts = message.split(' ');
  const type = parts[0].replace('/', '');
  const amount = parseFloat(parts[1]);
  const category = parts[2];
  const description = parts.slice(3).join(' ');

  if (isNaN(amount)) {
    return "❌ Invalid amount. Format: /expense 50 food Lunch";
  }

  try {
    // Find the user associated with this Telegram ID
    const linksRef = collection(db, "userTelegramLinks");
    const q = query(linksRef, where("telegramId", "==", telegramId), where("verified", "==", true));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return "❌ Please link your Telegram account with FinanceFlow first.";
    }

    const userId = querySnapshot.docs[0].id;

    // Add the transaction
    await addDoc(collection(db, "telegram_transactions"), {
      userId,
      type,
      amount,
      category,
      description,
      timestamp: new Date(),
      source: 'telegram'
    });

    return `✅ Recorded ${type}:
Amount: $${amount}
Category: ${category}
Description: ${description}`;
  } catch (error) {
    console.error("Error recording transaction:", error);
    return "❌ Error recording transaction. Please try again.";
  }
};