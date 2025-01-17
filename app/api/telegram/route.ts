import { NextResponse } from 'next/server';
import { getBotStatus, checkBotHealth, BotManager } from '../../users/telegram_bot';

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

let initializationInProgress = false;
const INIT_TIMEOUT = 30000; // 30 seconds

async function initializeBotWithTimeout() {
  if (initializationInProgress) {
    console.log('Bot initialization already in progress');
    return false;
  }

  try {
    initializationInProgress = true;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Bot initialization timeout')), INIT_TIMEOUT)
    );

    const initPromise = BotManager.getInstance();
    const bot = await Promise.race([initPromise, timeoutPromise]);
    
    if (!bot) {
      throw new Error('Failed to initialize bot');
    }

    console.log('Bot initialized successfully');
    return true;
  } catch (error: unknown) {
    const errorWithMessage = toErrorWithMessage(error);
    console.error('Bot initialization error:', errorWithMessage);
    return false;
  } finally {
    initializationInProgress = false;
  }
}

export async function GET() {
  try {
    // Get current status
    const status = getBotStatus();
    console.log('Current bot status:', status);

    // If bot is not initialized or unhealthy, try to initialize
    if (!status.isInitialized || !status.health.isHealthy) {
      console.log('Bot needs initialization/reinitialization');
      const initialized = await initializeBotWithTimeout();
      
      if (!initialized) {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to initialize bot',
          botStatus: getBotStatus()
        }, { status: 500 });
      }
    }

    // Perform health check
    const isHealthy = await checkBotHealth();
    const currentStatus = getBotStatus();

    return NextResponse.json({
      status: isHealthy ? 'success' : 'warning',
      message: isHealthy ? 'Telegram bot is running' : 'Bot is running but may have issues',
      botStatus: currentStatus,
      lastCheck: new Date().toISOString()
    });
  } catch (error: unknown) {
    const errorWithMessage = toErrorWithMessage(error);
    console.error('Error in Telegram bot API route:', errorWithMessage);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to manage Telegram bot',
      error: errorWithMessage.message,
      botStatus: getBotStatus()
    }, { status: 500 });
  }
}

// Health check endpoint
export async function HEAD() {
  try {
    const isHealthy = await checkBotHealth();
    const status = getBotStatus();
    
    return new Response(null, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Bot-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-Last-Check': new Date().toISOString(),
        'X-Bot-Initialized': String(status.isInitialized),
        'X-Bot-Polling': String(status.isPolling),
        'X-Firebase-Connected': String(status.isFirebaseConnected),
        'X-Error-Count': String(status.health.errors.length)
      }
    });
  } catch (error: unknown) {
    const errorWithMessage = toErrorWithMessage(error);
    console.error('Health check error:', errorWithMessage);
    return new Response(null, { 
      status: 500,
      headers: {
        'X-Error': errorWithMessage.message,
        'X-Bot-Status': 'error',
        'X-Last-Check': new Date().toISOString()
      }
    });
  }
}

// Cleanup on route change
export async function DELETE() {
  try {
    const bot = await BotManager.getInstance();
    if (bot) {
      await BotManager.cleanup();
    }
    return NextResponse.json({
      status: 'success',
      message: 'Bot cleanup completed'
    });
  } catch (error: unknown) {
    const errorWithMessage = toErrorWithMessage(error);
    console.error('Cleanup error:', errorWithMessage);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to cleanup bot',
      error: errorWithMessage.message
    }, { status: 500 });
  }
}