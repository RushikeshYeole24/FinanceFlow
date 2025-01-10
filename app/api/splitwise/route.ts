import { NextResponse } from 'next/server';

interface Contribution {
  name: string;
  amount: number;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

interface Person {
  name: string;
  amount: number;
  difference: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contributions = body.contributions as Contribution[];
    
    // Calculate total and equal share
    const total = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
    const equalShare = total / contributions.length;
    
    // Calculate differences
    const people: Person[] = contributions.map(contrib => ({
      name: contrib.name,
      amount: contrib.amount,
      difference: contrib.amount - equalShare
    }));

    // Calculate transactions
    const transactions: Transaction[] = [];
    
    // Sort by difference to start with highest debts and credits
    const sortedPeople = [...people].sort((a, b) => a.difference - b.difference);
    
    let i = 0;  // index for people who need to pay (negative difference)
    let j = sortedPeople.length - 1;  // index for people who need to receive (positive difference)
    
    while (i < j) {
      const debtor = sortedPeople[i];
      const creditor = sortedPeople[j];
      
      if (Math.abs(debtor.difference) < 0.01) { i++; continue; }  // Skip if difference is negligible
      if (Math.abs(creditor.difference) < 0.01) { j--; continue; }
      
      const amount = Math.min(Math.abs(debtor.difference), creditor.difference);
      
      if (amount > 0) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(amount.toFixed(2))
        });
        
        // Update differences
        debtor.difference += amount;
        creditor.difference -= amount;
      }
      
      // Move indices based on who got settled
      if (Math.abs(debtor.difference) < 0.01) i++;
      if (Math.abs(creditor.difference) < 0.01) j--;
    }

    return NextResponse.json({
      equalShare,
      result: people,
      transactions
    });
  } catch (error) {
    console.error('Error processing split money:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 