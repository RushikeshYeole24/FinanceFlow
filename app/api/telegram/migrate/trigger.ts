export async function triggerMigration() {
  try {
    const response = await fetch('/api/telegram/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Migration failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Migration result:', result);
    return result;
  } catch (error) {
    console.error('Error triggering migration:', error);
    throw error;
  }
}