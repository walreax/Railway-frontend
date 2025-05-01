import { NextResponse } from 'next/server';
import { createConnection } from 'mysql2/promise';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Railway_DB',
  });

  try {
    const [rows] = await connection.execute(
      'SELECT Balance as WalletBalance FROM EWallet WHERE UserID = ?',
      [userId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({ balance: (rows[0] as any).WalletBalance });
    }
    return NextResponse.json({ error: 'Wallet not found for this user' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  } finally {
    await connection.end();
  }
}
