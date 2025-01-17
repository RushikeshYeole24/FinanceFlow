import { NextResponse } from 'next/server';
import { migrateTelegramTransactions } from '../migrate';

export async function POST() {
  try {
    await migrateTelegramTransactions();
    return NextResponse.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, message: 'Migration failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}