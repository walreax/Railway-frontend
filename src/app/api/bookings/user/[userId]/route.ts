import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function GET(
  req: NextRequest,
  context: { params: { userId: string } }
) {
  const { params } = context;

  try {
    const userId = params.userId;
    const searchParams = new URL(req.url).searchParams;
    const status = searchParams.get('status') || 'all';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const connection = await getConnection();
    
    try {
      // Call stored procedure for user bookings
      const [results] = await connection.execute(
        'CALL sp_ViewUserBookings(?, ?, ?, ?)',
        [
          userId,
          status,
          fromDate || null,
          toDate || null
        ]
      );

      const bookings = Array.isArray(results) && results[0] ? results[0] : [];

      return NextResponse.json(bookings.map((booking: any) => ({
        bookingId: booking.TicketID,
        pnr: booking.PNR,
        trainNumber: booking.TrainNumber,
        trainName: booking.TrainName,
        fromStation: booking.FromStation,
        toStation: booking.ToStation,
        journeyDate: booking.JourneyDate,
        bookingDate: booking.BookingDate,
        totalPassengers: booking.TotalPassengers,
        fare: booking.TotalFare,
        status: booking.BookingStatus,
        payment: {
          method: booking.PaymentMethod
        },
        passengers: booking.PassengerNames ? 
          booking.PassengerNames.split(', ').map((name: string, index: number) => ({
            name,
            seatAllocation: booking.SeatAllocations?.split(', ')[index] || null
          })) : []
      })));
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}