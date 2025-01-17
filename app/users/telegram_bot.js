// telegram-bot.js
import TelegramBot from 'node-telegram-bot-api';
import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  limit
} from 'firebase/firestore';

// Constants
const TOKEN = '7863722005:AAFiHEnrodIxJU88RtB8-_e2OqK8vnRGMzM';
const POLLING_CHECK_INTERVAL = 300000; // 5 minutes
const CONNECTION_CHECK_INTERVAL = 600000; // 10 minutes
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const INITIALIZATION_COOLDOWN = 60000; // 1 minute cooldown after initialization
const FIREBASE_UID_LENGTH = 28; // Standard Firebase Auth UID length

// Bot instance and state management
export class BotManager {
  static instance = null;
  static isPolling = false;
  static lastPollingCheck = 0;
  static isFirebaseConnected = false;
  static lastConnectionCheck = 0;
  static isShuttingDown = false;

  static status = {
    isInitialized: false,
    lastInitialized: null,
    health: {
      isHealthy: false,
      lastCheck: null,
      errors: []
    }
  };

  static async cleanup() {
    if (this.instance && this.isPolling) {
      this.isShuttingDown = true;
      try {
        await this.instance.stopPolling();
        debugLog('Bot polling stopped successfully');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
      this.instance = null;
      this.isPolling = false;
      this.isShuttingDown = false;
      this.status.isInitialized = false;
      debugLog('Bot cleanup completed');
    }
  }

  static isInitializing = false;
  static initializationTimeout = null;

  static initializationPromise = null;

  static async getInstance() {
    // If there's already an initialization in progress, wait for it
    if (this.initializationPromise) {
      debugLog('Waiting for existing initialization to complete');
      return this.initializationPromise;
    }

    // If we have a working instance, return it
    if (this.instance && this.isPolling) {
      try {
        await this.instance.getMe();
        debugLog('Existing bot instance is responsive');
        this.updatePollingStatus(true);
        return this.instance;
      } catch (error) {
        debugLog('Existing instance is unresponsive:', error.message);
        this.status.health.errors.push({
          timestamp: new Date(),
          error: error.message,
          type: 'instance_check'
        });
        await this.cleanup();
      }
    }

    // Create a new initialization promise
    this.initializationPromise = (async () => {
      try {
        this.isInitializing = true;
        debugLog('Starting new bot initialization');

        // Set a timeout for initialization
        const timeoutPromise = new Promise((_, reject) => {
          this.initializationTimeout = setTimeout(() => {
            reject(new Error('Bot initialization timeout'));
          }, 30000);
        });

        // Initialize the bot
        const initPromise = initializeBot();
        this.instance = await Promise.race([initPromise, timeoutPromise]);

        if (!this.instance) {
          throw new Error('Failed to initialize bot instance');
        }

        debugLog('Bot initialization completed successfully');
        return this.instance;
      } catch (error) {
        debugLog('Bot initialization failed:', error.message);
        await this.cleanup();
        throw error;
      } finally {
        this.isInitializing = false;
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
          this.initializationTimeout = null;
        }
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  static updatePollingStatus(isActive) {
    this.isPolling = isActive;
    this.lastPollingCheck = Date.now();
    this.status.health.isHealthy = isActive;
    this.status.health.lastCheck = new Date();
    debugLog(`Bot polling status updated: ${isActive}`);
  }
}

// Enhanced debug logging with timestamps
const debugLog = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[Telegram Bot ${timestamp}]:`, ...args);
};

// Verify Firebase connection and collection existence
const verifyFirebaseConnection = async () => {
  try {
    debugLog('Starting Firebase connection verification');
    
    // First, verify basic connection
    const testRef = collection(db, 'telegram_transactions');
    await getDocs(query(testRef, limit(1)));
    debugLog('Basic Firebase connection successful');

    // Verify required collections exist
    const requiredCollections = ['telegram_transactions', 'userTelegramLinks'];
    for (const collectionName of requiredCollections) {
      const collRef = collection(db, collectionName);
      const snapshot = await getDocs(query(collRef, limit(1)));
      if (!snapshot.empty || snapshot.metadata?.fromCache === false) {
        debugLog(`Verified collection ${collectionName} exists and is accessible`);
      } else {
        debugLog(`Warning: Collection ${collectionName} appears to be empty or inaccessible`);
      }
    }

    BotManager.isFirebaseConnected = true;
    BotManager.lastConnectionCheck = Date.now();
    debugLog('All Firebase verifications passed');
    return true;
  } catch (error) {
    BotManager.isFirebaseConnected = false;
    console.error('Firebase verification error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    BotManager.status.health.errors.push({
      timestamp: new Date(),
      error: error.message,
      type: 'firebase'
    });
    
    return false;
  }
};

// Message handler setup
const setupMessageHandler = (bot) => {
  if (!bot) return;

  bot.on('message', async (msg) => {
    debugLog('Processing new message');
    try {
      debugLog('Received message:', msg);
      const chatId = msg.chat.id;
      const text = msg.text?.trim();
      const username = msg.from.username;

      if (!text || !username) {
        debugLog('Invalid message format:', { text, username });
        await bot.sendMessage(chatId, 'Invalid message format. Please try again.');
        return;
      }

      // Verify Firebase connection before proceeding
      if (!BotManager.isFirebaseConnected || Date.now() - BotManager.lastConnectionCheck >= CONNECTION_CHECK_INTERVAL) {
        const isConnected = await verifyFirebaseConnection();
        if (!isConnected) {
          const errorMsg = 'Service temporarily unavailable. Please try again later.';
          debugLog(errorMsg);
          await bot.sendMessage(chatId, errorMsg);
          return;
        }
      }

      // Handle verification code
      if (text.length === 6 && text === text.toUpperCase()) {
        await handleVerificationCode(bot, chatId, username, text);
        return;
      }

      // Handle transaction
      await handleTransaction(bot, chatId, username, text);

    } catch (error) {
      console.error('Error processing message:', error);
      try {
        await bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });
};

// Handle verification code
const handleVerificationCode = async (bot, chatId, username, code) => {
  debugLog('Processing verification code:', code);
  const linksRef = collection(db, "userTelegramLinks");
  const q = query(linksRef, 
    where("telegramUsername", "==", username),
    where("verificationCode", "==", code),
    where("verified", "==", false)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    debugLog('Found matching verification code');
    const linkDoc = querySnapshot.docs[0];
    const docRef = doc(db, "userTelegramLinks", linkDoc.id);
    await setDoc(docRef, {
      ...linkDoc.data(),
      verified: true,
      verifiedAt: Timestamp.now()
    }, { merge: true });
    debugLog('Updated verification status');
    await bot.sendMessage(chatId, 'Your account has been verified! You can now send transactions in the format: title, category, amount, type');
  } else {
    await bot.sendMessage(chatId, 'Invalid or expired verification code. Please generate a new code from the website.');
  }
};

// Handle transaction message
const handleTransaction = async (bot, chatId, username, text) => {
  debugLog('Looking up user link for Telegram username:', username);
  const linksRef = collection(db, "userTelegramLinks");
  
  // First, find all documents for this username
  const q = query(linksRef, 
    where("telegramUsername", "==", username),
    where("verified", "==", true)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    debugLog('No verified link found for username:', username);
    await bot.sendMessage(chatId, 'Your account is not verified. Please link and verify your account first.');
    return;
  }

  // Get and validate the Firebase user.uid from the document ID
  const linkDoc = querySnapshot.docs[0];
  const linkData = linkDoc.data();
  const firebaseUserId = linkDoc.id;  // This is the Firebase user.uid
  const storedUserId = linkData.userId;  // userId stored in document data

  debugLog('Validating Firebase userId:', {
    docId: linkDoc.id,
    docUserId: firebaseUserId,
    storedUserId,
    telegramUsername: linkData.telegramUsername,
    verified: linkData.verified
  });

  // Ensure document ID matches stored userId
  if (firebaseUserId !== storedUserId) {
    debugLog('Firebase userId mismatch:', {
      docId: linkDoc.id,
      docUserId: firebaseUserId,
      storedUserId,
      telegramUsername: linkData.telegramUsername
    });
    await bot.sendMessage(chatId, 'Error: Account linking issue detected. Please relink your account from the website.');
    return;
  }

  // Validate Firebase userId format
  const firebaseIdValidation = {
    hasValue: !!firebaseUserId,
    isString: typeof firebaseUserId === 'string',
    hasCorrectLength: firebaseUserId?.length === FIREBASE_UID_LENGTH,
    matchesFormat: !!firebaseUserId?.match(`^[A-Za-z0-9]{${FIREBASE_UID_LENGTH}}$`),
    isNotChatId: firebaseUserId !== String(chatId)
  };

  debugLog('Firebase userId validation:', {
    ...firebaseIdValidation,
    userId: firebaseUserId,
    chatId
  });

  if (!Object.values(firebaseIdValidation).every(Boolean)) {
    debugLog('Firebase userId validation failed:', firebaseIdValidation);
    await bot.sendMessage(chatId, 'Error: Invalid account linking detected. Please relink your account from the website.');
    return;
  }

  debugLog('Firebase userId validation passed:', {
    userId: firebaseUserId,
    validations: firebaseIdValidation
  });
  const parts = text.split(',').map(item => item?.trim());
  debugLog('Parsed message parts:', parts);
  
  const [title, category, amount, type] = parts;

  if (!title || !category || !amount || !type) {
    await bot.sendMessage(chatId, 'Invalid format. Please use: title, category, amount, type');
    return;
  }

  const validCategories = ['Food', 'Transport', 'Utilities'];
  if (!validCategories.includes(category)) {
    debugLog('Invalid category:', category);
    await bot.sendMessage(chatId, 'Invalid category. Please use: Food, Transport, or Utilities');
    return;
  }

  // Validate transaction type
  const validTypes = ['expense', 'income'];
  const normalizedType = type.toLowerCase().trim();
  if (!validTypes.includes(normalizedType)) {
    debugLog('Invalid transaction type:', type);
    await bot.sendMessage(chatId, 'Invalid transaction type. Please use: expense or income');
    return;
  }

  let parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    await bot.sendMessage(chatId, 'Invalid amount. Please provide a valid number.');
    return;
  }

  // Ensure amount is positive for income and negative for expense
  if (normalizedType === 'expense' && parsedAmount > 0) {
    parsedAmount = -parsedAmount;
  } else if (normalizedType === 'income' && parsedAmount < 0) {
    parsedAmount = Math.abs(parsedAmount);
  }

  debugLog('Processed amount:', {
    original: amount,
    parsed: parsedAmount,
    type: normalizedType
  });

  // Create transaction with the validated Firebase userId
  const transactionData = {
    title: title?.trim() || 'Telegram Transaction',
    category: category?.trim() || 'Other',
    amount: parsedAmount,
    type: normalizedType,
    userId: firebaseUserId,  // Using the document ID as the Firebase user.uid
    timestamp: Timestamp.now(),
    source: 'telegram',
    description: title?.trim() || 'Telegram Transaction', // Add description field to match transactions collection
    metadata: {
      chatId,
      username,
      processedAt: new Date().toISOString(),
      linkDocId: linkDoc.id,
      validatedAt: new Date().toISOString()
    }
  };

  // Debug log before saving
  debugLog('Saving telegram transaction:', {
    ...transactionData,
    timestamp: transactionData.timestamp.toDate().toISOString()
  });

  // Double-check we're using the correct userId
  if (transactionData.userId !== storedUserId || transactionData.userId !== firebaseUserId) {
    debugLog('Critical: Transaction userId mismatch:', {
      transactionUserId: transactionData.userId,
      storedUserId,
      firebaseUserId,
      chatId
    });
    throw new Error('Critical: Transaction userId mismatch detected');
  }

  // Final validation before saving
  const finalValidation = {
    hasValidUserId: transactionData.userId === firebaseUserId,
    isNotChatId: transactionData.userId !== String(chatId),
    hasCorrectLength: transactionData.userId.length === FIREBASE_UID_LENGTH,
    matchesFormat: !!transactionData.userId.match(`^[A-Za-z0-9]{${FIREBASE_UID_LENGTH}}$`)
  };

  debugLog('Final transaction validation:', finalValidation);

  if (!Object.values(finalValidation).every(Boolean)) {
    throw new Error('Final validation failed: ' + JSON.stringify(finalValidation));
  }

  try {
    // Verify the data before saving
    const verificationData = {
      hasTitle: !!transactionData.title,
      hasDescription: !!transactionData.description,
      hasCategory: !!transactionData.category,
      hasAmount: !isNaN(transactionData.amount),
      hasType: ['expense', 'income'].includes(transactionData.type),
      hasUserId: !!transactionData.userId,
      hasTimestamp: !!transactionData.timestamp,
      userId: transactionData.userId
    };

    // Additional validation for amount format
    if (typeof transactionData.amount !== 'number') {
      throw new Error('Amount must be a number');
    }

    // Additional validation for type format
    if (!['expense', 'income'].includes(transactionData.type)) {
      throw new Error('Invalid transaction type');
    }

    debugLog('Transaction verification:', verificationData);

    // Validate all required fields
    if (!Object.values(verificationData).every(Boolean)) {
      const missingFields = Object.entries(verificationData)
        .filter(entry => !entry[1])
        .map(([fieldName]) => fieldName.replace('has', '').toLowerCase())
        .join(', ');
      throw new Error(`Missing required fields: ${missingFields}`);
    }

    // Save to Firestore
    debugLog('Adding document to telegram_transactions collection');

    const docRef = await addDoc(collection(db, 'telegram_transactions'), transactionData);
    debugLog('Transaction saved successfully:', {
      id: docRef.id,
      ...transactionData,
      timestamp: transactionData.timestamp.toDate().toISOString()
    });

    // Send detailed success message
    const successMessage = `Transaction saved successfully!\n\nDetails:\n- Title: ${transactionData.title}\n- Category: ${transactionData.category}\n- Amount: ${transactionData.amount}\n- Type: ${transactionData.type}`;
    await bot.sendMessage(chatId, successMessage);

    // Verify the saved document
    const savedDoc = await getDocs(query(
      collection(db, 'telegram_transactions'),
      where('userId', '==', firebaseUserId),
      orderBy('timestamp', 'desc'),
      limit(1)
    ));

    if (!savedDoc.empty) {
      debugLog('Verified saved transaction:', savedDoc.docs[0].data());
    } else {
      throw new Error('Transaction saved but not found in verification query');
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    debugLog('Failed to save transaction:', {
      error: error.message,
      userId: firebaseUserId,
      data: {
        title,
        category,
        amount: parsedAmount,
        type: normalizedType
      }
    });

    // Send more detailed error message
    const errorMessage = `Failed to save transaction.\nError: ${error.message}\nPlease try again with format: title, category, amount, type`;
    await bot.sendMessage(chatId, errorMessage);
  }
};

// Bot initialization
export const initializeBot = async () => {
  if (BotManager.instance) {
    debugLog('Bot already initialized');
    return BotManager.instance;
  }

  // Cleanup any existing instances first
  await BotManager.cleanup();

  try {
    debugLog('Initializing Telegram bot');
    const bot = new TelegramBot(TOKEN, {
      polling: true,
      pollingOptions: {
        timeout: 10,
        interval: 2000
      }
    });

    BotManager.updatePollingStatus(true);
    BotManager.status.isInitialized = true;
    BotManager.status.lastInitialized = new Date();

    // Setup event handlers
    setupEventHandlers(bot);
    setupMessageHandler(bot);
    
    debugLog('Bot initialized successfully');
    BotManager.instance = bot;
    return bot;
  } catch (error) {
    console.error('Error initializing bot:', error);
    BotManager.status.health.errors.push({
      timestamp: new Date(),
      error: error.message,
      type: 'initialization'
    });
    return null;
  }
};

// Setup event handlers
const setupEventHandlers = (bot) => {
  if (!bot) return;

  bot.on('error', async (error) => {
    console.error('Telegram Bot Error:', error);
    BotManager.status.health.errors.push({
      timestamp: new Date(),
      error: error.message,
      type: 'bot'
    });
    BotManager.updatePollingStatus(false);
    await checkBotHealth();
  });

  bot.on('polling_error', async (error) => {
    console.error('Polling Error:', error);
    BotManager.status.health.errors.push({
      timestamp: new Date(),
      error: error.message,
      type: 'polling'
    });
    BotManager.updatePollingStatus(false);
    await checkBotHealth();
  });
};

// Health check with retry mechanism
export const checkBotHealth = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds

  try {
    if (retryCount >= MAX_RETRIES) {
      debugLog('Max health check retries reached');
      return false;
    }

    if (BotManager.isInitializing) {
      debugLog('Bot initialization in progress, skipping health check');
      return true;
    }

    const timeSinceLastCheck = Date.now() - BotManager.lastPollingCheck;
    debugLog('Health check - Time since last check:', timeSinceLastCheck);

    // Skip health check if:
    // 1. Bot is initializing
    // 2. Not enough time has passed since last check
    // 3. Bot is already polling and healthy
    // 4. Bot was recently initialized (in cooldown period)
    const timeSinceInit = BotManager.status.lastInitialized ? 
      Date.now() - BotManager.status.lastInitialized.getTime() : 
      Infinity;

    if (BotManager.isInitializing || 
        timeSinceLastCheck <= POLLING_CHECK_INTERVAL ||
        (BotManager.isPolling && BotManager.status.health.isHealthy) ||
        timeSinceInit <= INITIALIZATION_COOLDOWN) {
      debugLog('Skipping health check - Bot is in a good state or cooldown period');
      return BotManager.isPolling;
    }

    // Test if the bot is responsive
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT)
    );
    const healthCheckPromise = BotManager.instance?.getMe();
    
    if (!healthCheckPromise) {
      debugLog('No bot instance available for health check');
      return false;
    }

    try {
      await Promise.race([healthCheckPromise, timeoutPromise]);
      debugLog('Bot is responsive');
      BotManager.updatePollingStatus(true);
      return true;
    } catch (error) {
      debugLog('Bot is unresponsive:', error.message);
      
      // Only attempt recovery if:
      // 1. We haven't exceeded max retries
      // 2. We've had multiple consecutive failures
      // 3. The bot instance exists but is unresponsive
      if (retryCount < MAX_RETRIES && 
          BotManager.status.health.errors.length >= 2 &&
          BotManager.instance) {
        debugLog(`Multiple health check failures detected, attempting recovery (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        // Try to recover the existing instance first
        try {
          debugLog('Attempting to restart polling on existing instance');
          await BotManager.instance.stopPolling();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for polling to stop
          await BotManager.instance.startPolling();
          debugLog('Successfully recovered existing bot instance');
          BotManager.updatePollingStatus(true);
          return true;
        } catch (recoveryError) {
          debugLog('Failed to recover existing instance:', recoveryError.message);
          BotManager.status.health.errors.push({
            timestamp: new Date(),
            error: recoveryError.message,
            type: 'recovery'
          });

          // Only attempt full reinitialization if we haven't already tried
          if (BotManager.status.health.errors.filter(e => e.type === 'recovery').length <= 1) {
            debugLog('First recovery failure, attempting full reinitialization');
            await BotManager.cleanup();
            await BotManager.getInstance();
            return checkBotHealth(retryCount + 1);
          } else {
            debugLog('Multiple recovery failures detected, marking as unhealthy');
            BotManager.updatePollingStatus(false);
            return false;
          }
        }
      }
      
      // If we can't recover, mark as unhealthy
      BotManager.updatePollingStatus(false);
      return false;
    }
  } catch (error) {
    console.error('Health check error:', error);
    BotManager.status.health.errors.push({
      timestamp: new Date(),
      error: error.message,
      type: 'health_check'
    });
    BotManager.updatePollingStatus(false);
    return false;
  }
};

// Get bot status
export const getBotStatus = () => ({
  ...BotManager.status,
  isPolling: BotManager.isPolling,
  lastPollingCheck: BotManager.lastPollingCheck,
  isFirebaseConnected: BotManager.isFirebaseConnected,
  lastConnectionCheck: BotManager.lastConnectionCheck
});

// Initialize bot on module load
const initializeOnLoad = async () => {
  try {
    debugLog('Starting bot initialization process');
    await BotManager.cleanup(); // Ensure clean state
    const bot = await BotManager.getInstance();
    if (!bot) {
      throw new Error('Failed to initialize bot');
    }
    debugLog('Bot initialized successfully on module load');
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    // Don't retry here, let the health check handle it
    BotManager.updatePollingStatus(false);
  }
};

// Start initialization
initializeOnLoad().catch(error => {
  console.error('Critical initialization error:', error);
});

// Periodic health checks with jitter to prevent thundering herd
const jitter = Math.floor(Math.random() * 10000); // Random delay up to 10 seconds
setInterval(async () => {
  if (!BotManager.isInitializing && !BotManager.isShuttingDown) {
    debugLog('Performing periodic health check');
    await checkBotHealth();
  } else {
    debugLog('Skipping health check - Bot is initializing or shutting down');
  }
}, POLLING_CHECK_INTERVAL + jitter);

// Periodic Firebase connection checks
setInterval(async () => {
  if (!BotManager.isFirebaseConnected || Date.now() - BotManager.lastConnectionCheck >= CONNECTION_CHECK_INTERVAL) {
    debugLog('Performing periodic Firebase connection check');
    await verifyFirebaseConnection();
  }
}, CONNECTION_CHECK_INTERVAL);

// Cleanup on process exit
process.on('SIGTERM', async () => {
  debugLog('SIGTERM received, cleaning up...');
  await BotManager.cleanup();
});

process.on('SIGINT', async () => {
  debugLog('SIGINT received, cleaning up...');
  await BotManager.cleanup();
});

// Export all necessary functions and types
export { BotManager };
export { getBotStatus };
export { checkBotHealth };
export { initializeBot };

// Initialize the bot and export the instance
export default BotManager.getInstance();