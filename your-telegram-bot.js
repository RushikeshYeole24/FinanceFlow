import { addDoc, collection } from 'firebase/firestore';
import { db } from './app/users/firebaseConfig.js';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Check if token exists
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not defined in .env.local');
  process.exit(1);
}

// Initialize the bot with your token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('Bot is running...'); // Debug log

// When receiving a transaction message from Telegram
bot.on('message', async (msg) => {
  try {
    console.log('Received message:', msg.text); // Debug log

    // Check if message matches expected format
    if (!msg.text || !msg.text.match(/^(expense|income)\s+\d+(\.\d+)?\s+\w+/i)) {
      bot.sendMessage(msg.chat.id, 'Please use format: expense/income amount category description');
      return;
    }

    const [type, amount, category, ...titleParts] = msg.text.split(' ');
    const title = titleParts.join(' ');

    const transaction = {
      title: title,
      amount: parseFloat(amount),
      category: category,
      type: type.toLowerCase(),
      timestamp: new Date(),
      userId: msg.from.id,
    };

    const docRef = await addDoc(collection(db, 'telegram_transactions'), transaction);
    bot.sendMessage(msg.chat.id, `Transaction recorded! ID: ${docRef.id}`);
    
  } catch (error) {
    console.error('Error processing message:', error);
    bot.sendMessage(msg.chat.id, 'Sorry, there was an error recording your transaction.');
  }
});

// Handle errors
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
}); 