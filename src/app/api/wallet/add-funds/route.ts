import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // Create a dummy ticket for wallet transactions
      const [ticketResult] = await connection.execute(
        'INSERT INTO Tickets (PNR, UserID, TrainID, ScheduleID, FromStation, ToStation, JourneyDate, TotalPassengers, TotalFare, PaymentMethod, BookingStatus) VALUES (?, ?, 1, 1, "WALLET", "WALLET", CURDATE(), 0, ?, "direct", "wallet_credit")',
        [`WAL${Date.now()}`, userId, amount]
      );
      const ticketId = ticketResult.insertId;

      // Call the wallet operation stored procedure
      const [results] = await connection.execute(
        'CALL sp_WalletOperation(?, ?, ?, @newBalance)',
        [userId, amount, 'add']
      );

      // Get the new balance
      const [balanceResult] = await connection.execute('SELECT @newBalance as newBalance');
      const newBalance = balanceResult[0].newBalance;

      // Record the transaction
      await connection.execute(
        'INSERT INTO Transactions (TicketID, UserID, Amount, TransactionType, PaymentMethod, PaymentStatus) VALUES (?, ?, ?, ?, ?, ?)',
        [ticketId, userId, amount, 'wallet_credit', 'direct', 'completed']
      );

      return NextResponse.json({
        success: true,
        message: 'Funds added successfully',
        balance: newBalance
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error adding funds to wallet:', error);
    return NextResponse.json(
      { error: 'Failed to add funds to wallet' },
      { status: 500 }
    );
  }
}