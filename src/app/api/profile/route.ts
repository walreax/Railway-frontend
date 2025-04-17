import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';
import { RowDataPacket } from 'mysql2';

interface PaymentMethod {
  id: number;
  cardNumber?: string;
  cardHolderName?: string;
  cardExpiry?: string;
  upiId?: string;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      console.error('Missing x-user-id header in the request');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const connection = await getConnection();
    try {
      // Get user details without wallet balance
      const [userResults] = await connection.execute<RowDataPacket[]>(
        'SELECT Username, Email, PhonePrimary, PhoneSecondary FROM Users WHERE UserID = ?',
        [userId]
      );

      if (!Array.isArray(userResults) || userResults.length === 0) {
        console.error(`No user found for UserID: ${userId}`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResults[0];

      // Get payment methods if they exist
      const [paymentMethods] = await connection.execute<RowDataPacket[]>(
        'SELECT PaymentID as id, CardNumber as cardNumber, CardHolderName as cardHolderName, ' +
        'CardExpiry as cardExpiry, UPI_ID as upiId ' +
        'FROM PaymentDetails WHERE UserID = ? AND IsActive = TRUE',
        [userId]
      );

      // Get wallet balance
      const [walletResults] = await connection.execute<RowDataPacket[]>(
        'SELECT Balance as balance FROM EWallet WHERE UserID = ?',
        [userId]
      );

      const walletBalance = walletResults[0]?.balance || 0;

      return NextResponse.json({
        username: user.Username,
        email: user.Email,
        phonePrimary: user.PhonePrimary,
        phoneSecondary: user.PhoneSecondary,
        walletBalance: walletBalance,
        paymentMethods: Array.isArray(paymentMethods) ? paymentMethods.map((method) => ({
          id: method.id,
          type: method.cardNumber ? 'card' : 'upi',
          details: {
            cardNumber: method.cardNumber ? '••••' + method.cardNumber.slice(-4) : undefined,
            cardHolderName: method.cardHolderName,
            cardExpiry: method.cardExpiry,
            upiId: method.upiId
          }
        })) : []
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}