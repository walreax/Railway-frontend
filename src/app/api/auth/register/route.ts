import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

function validatePhoneNumber(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

function validateCardNumber(cardNumber: string | null): boolean {
  if (!cardNumber) return true;
  return /^\d{16}$/.test(cardNumber.replace(/\s/g, ''));
}

function validateCardExpiry(expiry: string | null): boolean {
  if (!expiry) return true;
  return /^\d{2}\/\d{2}$/.test(expiry);
}

function validateUpiId(upiId: string | null): boolean {
  if (!upiId) return true;
  return /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/i.test(upiId);
}

export async function POST(req: NextRequest) {
  let connection;
  try {
    const { 
      username, 
      email, 
      password,
      phonePrimary, 
      phoneSecondary,
      cardNumber,
      cardExpiry,
      cardHolderName,
      upiId,
      userType = 'normal'
    } = await req.json();

    // Basic validation
    if (!username || !email || !password || !phonePrimary) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Phone number validation
    if (!validatePhoneNumber(phonePrimary)) {
      return NextResponse.json(
        { error: 'Primary phone number must be 10 digits' },
        { status: 400 }
      );
    }

    if (phoneSecondary && !validatePhoneNumber(phoneSecondary)) {
      return NextResponse.json(
        { error: 'Secondary phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Payment method validation
    if (cardNumber) {
      if (!validateCardNumber(cardNumber)) {
        return NextResponse.json(
          { error: 'Invalid card number' },
          { status: 400 }
        );
      }

      if (!cardExpiry || !validateCardExpiry(cardExpiry)) {
        return NextResponse.json(
          { error: 'Invalid card expiry date' },
          { status: 400 }
        );
      }

      if (!cardHolderName) {
        return NextResponse.json(
          { error: 'Card holder name is required when adding a card' },
          { status: 400 }
        );
      }
    }

    if (upiId && !validateUpiId(upiId)) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format' },
        { status: 400 }
      );
    }

    connection = await getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // Call the stored procedure for user registration
      const [results] = await connection.execute(
        'CALL sp_CreateUser(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @p_UserID)',
        [
          username,
          password,
          email,
          phonePrimary,
          phoneSecondary,
          cardNumber ? cardNumber.replace(/\s/g, '') : null,
          cardExpiry,
          cardHolderName,
          upiId,
          userType,
        ]
      );

      // Get the output parameter
      const [outputResults] = await connection.execute(
        'SELECT @p_UserID as UserID'
      );
      
      const { UserID } = (outputResults as { UserID: number }[])[0];

      if (UserID) {
        // Get the complete user details
        const [userResults] = await connection.execute(`
          SELECT 
            u.UserID, u.Username, u.Email, u.PhonePrimary, u.PhoneSecondary, u.UserType,
            w.Balance as WalletBalance,
            pd.CardNumber, pd.CardExpiry, pd.CardHolderName, pd.UPI_ID as UpiId
          FROM Users u
          LEFT JOIN EWallet w ON u.UserID = w.UserID
          LEFT JOIN PaymentDetails pd ON u.UserID = pd.UserID AND pd.IsActive = TRUE
          WHERE u.UserID = ?
        `, [UserID]);

        const user = (userResults as any[])[0];

        // Mask sensitive payment info
        if (user.CardNumber) {
          user.CardNumber = '••••' + user.CardNumber.slice(-4);
        }

        await connection.commit();
        return NextResponse.json({
          user: {
            UserID: user.UserID,
            username: user.Username,
            email: user.Email,
            phonePrimary: user.PhonePrimary,
            phoneSecondary: user.PhoneSecondary,
            userType: user.UserType,
            walletBalance: user.WalletBalance || 0,
            paymentMethods: user.CardNumber || user.UpiId ? [{
              type: user.CardNumber ? 'card' : 'upi',
              details: {
                cardNumber: user.CardNumber,
                cardHolderName: user.CardHolderName,
                cardExpiry: user.CardExpiry,
                upiId: user.UpiId
              }
            }] : []
          }
        });
      }

      await connection.rollback();
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    } catch (error: any) {
      await connection.rollback();
      console.error('Registration error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}