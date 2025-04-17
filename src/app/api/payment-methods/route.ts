import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

function validateCardNumber(cardNumber: string): boolean {
  return /^\d{16}$/.test(cardNumber.replace(/\s/g, ''));
}

function validateCardExpiry(expiry: string): boolean {
  return /^\d{2}\/\d{2}$/.test(expiry);
}

function validateUpiId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/i.test(upiId);
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { type, cardNumber, cardExpiry, cardHolderName, upiId } = await req.json();

    // Validate based on payment type
    if (type === 'card') {
      if (!cardNumber || !cardExpiry || !cardHolderName) {
        return NextResponse.json(
          { error: 'All card details are required' },
          { status: 400 }
        );
      }

      if (!validateCardNumber(cardNumber)) {
        return NextResponse.json(
          { error: 'Invalid card number' },
          { status: 400 }
        );
      }

      if (!validateCardExpiry(cardExpiry)) {
        return NextResponse.json(
          { error: 'Invalid expiry date format (MM/YY)' },
          { status: 400 }
        );
      }
    } else if (type === 'upi') {
      if (!upiId) {
        return NextResponse.json(
          { error: 'UPI ID is required' },
          { status: 400 }
        );
      }

      if (!validateUpiId(upiId)) {
        return NextResponse.json(
          { error: 'Invalid UPI ID format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      const [result] = await connection.execute(
        'INSERT INTO PaymentDetails (UserID, CardNumber, CardExpiry, CardHolderName, UPI_ID) VALUES (?, ?, ?, ?, ?)',
        [
          userId,
          type === 'card' ? cardNumber.replace(/\s/g, '') : null,
          type === 'card' ? cardExpiry : null,
          type === 'card' ? cardHolderName : null,
          type === 'upi' ? upiId : null
        ]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Payment method added successfully' 
      });
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { error: 'This payment method already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add payment method' },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}