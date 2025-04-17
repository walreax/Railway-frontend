import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const connection = await getConnection();

    try {
      // Get user details and wallet balance in one query
      const [userResults] = await connection.execute<RowDataPacket[]>(
        `SELECT u.UserID, u.Username, u.Email, u.PhonePrimary, u.PhoneSecondary, u.UserType,
                w.Balance as WalletBalance
         FROM Users u
         LEFT JOIN EWallet w ON u.UserID = w.UserID
         WHERE u.Username = ? AND u.Password = ?`,
        [username, password]
      );

      if (!userResults || userResults.length === 0) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      const user = userResults[0];

      // Get payment methods if they exist
      const [paymentResults] = await connection.execute<RowDataPacket[]>(
        `SELECT PaymentID as id, CardNumber as cardNumber, CardHolderName as cardHolderName,
                CardExpiry as cardExpiry, UPI_ID as upiId
         FROM PaymentDetails
         WHERE UserID = ? AND IsActive = TRUE`,
        [user.UserID]
      );

      // Mask sensitive payment information
      const paymentMethods = paymentResults.map(method => ({
        id: method.id,
        type: method.cardNumber ? 'card' : 'upi',
        details: {
          cardNumber: method.cardNumber ? '••••' + method.cardNumber.slice(-4) : undefined,
          cardHolderName: method.cardHolderName,
          cardExpiry: method.cardExpiry,
          upiId: method.upiId
        }
      }));

      return NextResponse.json({
        user: {
          UserID: user.UserID, // Using consistent PascalCase
          username: user.Username,
          email: user.Email,
          phonePrimary: user.PhonePrimary,
          phoneSecondary: user.PhoneSecondary,
          userType: user.UserType,
          walletBalance: user.WalletBalance || 0,
          paymentMethods
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login. Please try again.' },
      { status: 500 }
    );
  }
}