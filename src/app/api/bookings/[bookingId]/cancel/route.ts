import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { userId } = await req.json();
    const { bookingId } = params;

    if (!userId || !bookingId) {
      return NextResponse.json(
        { error: 'User ID and booking ID are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // Call sp_CancelTicket with refund to wallet
      const [result] = await connection.execute(
        'CALL sp_CancelTicket(?, ?, @refundAmount)',
        [bookingId, 'wallet']
      );

      // Get refund amount from output parameter
      const [outputResults] = await connection.execute(
        'SELECT @refundAmount as refundAmount'
      );
      
      const refundAmount = (outputResults as any[])[0].refundAmount;

      return NextResponse.json({
        status: 'success',
        message: 'Booking cancelled successfully',
        refundAmount,
        refundedTo: 'wallet'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking. Please try again.' },
      { status: 500 }
    );
  }
}