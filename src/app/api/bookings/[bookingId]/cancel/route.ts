import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { userId, passengerId } = await req.json();
    const { bookingId } = params;

    if (!userId || !bookingId) {
      return NextResponse.json(
        { error: 'User ID and booking ID are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      let passengerIdToCancel = passengerId;
      
      // Get passenger ID if not provided
      if (!passengerIdToCancel) {
        // Get first non-cancelled passenger from this booking
        const [passengerResults] = await connection.execute(
          `SELECT PassengerID FROM Passengers 
           WHERE TicketID = ? AND BookingStatus != 'cancelled' 
           LIMIT 1`,
          [bookingId]
        );

        if (!Array.isArray(passengerResults) || passengerResults.length === 0) {
          return NextResponse.json(
            { error: 'No active passengers found for this booking' },
            { status: 400 }
          );
        }
        
        // Type check and safely access the passenger ID
        const passenger = passengerResults[0] as { PassengerID?: number | string };
        if (!passenger || passenger.PassengerID === undefined) {
          return NextResponse.json(
            { error: 'Invalid passenger data returned from database' },
            { status: 500 }
          );
        }
        
        passengerIdToCancel = passenger.PassengerID;
      }

      // Call sp_CancelTicket with refund to wallet
      const [result] = await connection.execute(
        'CALL sp_CancelTicket(?, ?, @refundAmount)',
        [passengerIdToCancel, 'wallet']
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