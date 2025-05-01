import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const bookingId = params.bookingId;
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - User ID is required' },
      { status: 401 }
    );
  }

  try {
    const connection = await getConnection();

    try {
      // First verify the user has permission to view this booking
      const [accessCheck] = await connection.execute(
        'SELECT UserID FROM Tickets WHERE TicketID = ?',
        [bookingId]
      );

      const accessResult = (accessCheck as any[])[0];
      
      if (!accessResult) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      if (accessResult.UserID !== Number(userId)) {
        return NextResponse.json(
          { error: 'You do not have permission to view this booking' },
          { status: 403 }
        );
      }

      // Get booking details
      const [bookingResults] = await connection.execute(`
        SELECT 
          t.TicketID,
          t.PNR,
          t.UserID,
          t.TrainID,
          tr.TrainName,
          tr.TrainNumber,
          t.FromStation,
          t.ToStation,
          t.JourneyDate,
          t.BookingDate,
          t.TotalFare,
          t.Status,
          t.PaymentMethod,
          origin.DepartureTime,
          dest.ArrivalTime
        FROM Tickets t
        JOIN Trains tr ON t.TrainID = tr.TrainID
        JOIN TrainSchedule ts ON tr.TrainID = ts.TrainID
        JOIN TrainStops origin ON ts.ScheduleID = origin.ScheduleID AND origin.StationName = t.FromStation
        JOIN TrainStops dest ON ts.ScheduleID = dest.ScheduleID AND dest.StationName = t.ToStation
        WHERE t.TicketID = ?
        AND ts.Status = 'active'
      `, [bookingId]);

      if ((bookingResults as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Booking details not found' },
          { status: 404 }
        );
      }

      const booking = (bookingResults as any[])[0];

      // Get passengers for this ticket
      const [passengerResults] = await connection.execute(`
        SELECT 
          PassengerID,
          Name,
          Age,
          Gender,
          CoachType,
          SeatNumber,
          Status
        FROM Passengers
        WHERE TicketID = ?
      `, [bookingId]);

      const passengers = passengerResults as any[];

      // Combine booking and passenger details
      const bookingDetails = {
        ...booking,
        passengers
      };

      return NextResponse.json(bookingDetails);

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}