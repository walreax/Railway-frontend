import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

interface PassengerInfo {
  name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
}

interface BookingRequest {
  trainId: string;
  fromStation: string;
  toStation: string;
  journeyDate: string;
  coachType: string;
  passengers: PassengerInfo[];
  paymentMethod: 'wallet' | 'card' | 'upi';
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

    const booking: BookingRequest = await req.json();

    // Basic validation
    if (!booking.trainId || !booking.fromStation || !booking.toStation || 
        !booking.journeyDate || !booking.coachType || !booking.passengers?.length) {
      return NextResponse.json(
        { error: 'Missing required booking details' },
        { status: 400 }
      );
    }

    // Check passenger count limit
    if (booking.passengers.length > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 passengers allowed per booking' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      let bookingId: number | null = null;
      let pnr: string | null = null;

      // Get schedule ID for the train
      const [scheduleResults] = await connection.execute(
        'SELECT ScheduleID FROM TrainSchedule WHERE TrainID = ? LIMIT 1',
        [booking.trainId]
      );
      
      const scheduleId = (scheduleResults as any[])[0]?.ScheduleID;

      if (!scheduleId) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Train schedule not found' },
          { status: 404 }
        );
      }

      // Use different stored procedures based on passenger count
      if (booking.passengers.length === 1) {
        // Use sp_BookTicket1 for single passenger
        const passenger = booking.passengers[0];
        const [bookingResults] = await connection.execute(
          'CALL sp_BookTicket1(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @p_PNR, @p_TicketID)',
          [
            userId,
            booking.trainId,
            scheduleId,
            booking.fromStation,
            booking.toStation,
            booking.journeyDate,
            booking.coachType,
            passenger.name,
            passenger.age,
            passenger.gender,
            booking.paymentMethod,
            null // paymentID is null for wallet payments
          ]
        );

        // Get output parameters
        const [outputResults] = await connection.execute('SELECT @p_PNR as PNR, @p_TicketID as TicketID');
        bookingId = (outputResults as any[])[0].TicketID;
        pnr = (outputResults as any[])[0].PNR;

      } else if (booking.passengers.length === 2) {
        // Use sp_BookTicket2 for two passengers
        const passenger1 = booking.passengers[0];
        const passenger2 = booking.passengers[1];
        
        const [bookingResults] = await connection.execute(
          'CALL sp_BookTicket2(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @p_PNR, @p_TicketID)',
          [
            userId,
            booking.trainId,
            scheduleId,
            booking.fromStation,
            booking.toStation,
            booking.journeyDate,
            booking.coachType,
            passenger1.name,
            passenger1.age,
            passenger1.gender,
            passenger2.name,
            passenger2.age,
            passenger2.gender,
            booking.paymentMethod,
            null // paymentID is null for wallet payments
          ]
        );

        // Get output parameters
        const [outputResults] = await connection.execute('SELECT @p_PNR as PNR, @p_TicketID as TicketID');
        bookingId = (outputResults as any[])[0].TicketID;
        pnr = (outputResults as any[])[0].PNR;

      } else {
        // For 3+ passengers, we need to create individual bookings and link them
        const firstPassenger = booking.passengers[0];
        
        // Create first booking to get a PNR
        const [bookingResults] = await connection.execute(
          'CALL sp_BookTicket1(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @p_PNR, @p_TicketID)',
          [
            userId,
            booking.trainId,
            scheduleId,
            booking.fromStation,
            booking.toStation,
            booking.journeyDate,
            booking.coachType,
            firstPassenger.name,
            firstPassenger.age,
            firstPassenger.gender,
            booking.paymentMethod,
            null // paymentID is null for wallet payments
          ]
        );

        // Get output parameters
        const [outputResults] = await connection.execute('SELECT @p_PNR as PNR, @p_TicketID as TicketID');
        bookingId = (outputResults as any[])[0].TicketID;
        pnr = (outputResults as any[])[0].PNR;
        
        // Book remaining passengers individually, but use the same PNR
        for (let i = 1; i < booking.passengers.length; i++) {
          const passenger = booking.passengers[i];
          
          await connection.execute(
            'INSERT INTO Passengers (TicketID, Name, Age, Gender, CoachType) VALUES (?, ?, ?, ?, ?)',
            [bookingId, passenger.name, passenger.age, passenger.gender, booking.coachType]
          );
          
          // Update passenger count and fare in the Tickets table
          await connection.execute(
            'UPDATE Tickets SET TotalPassengers = TotalPassengers + 1, TotalFare = TotalFare * ? WHERE TicketID = ?',
            [1 + (i * 0.05), bookingId]  // Add 5% fare increase per additional passenger
          );
        }
      }

      if (!bookingId) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Failed to create booking' },
          { status: 500 }
        );
      }

      await connection.commit();
      return NextResponse.json({ bookingId, pnr });

    } catch (error: any) {
      await connection.rollback();
      console.error('Error creating booking:', error);
      
      if (error.code === 'ER_NO_SEATS') {
        return NextResponse.json(
          { error: 'No seats available' },
          { status: 400 }
        );
      }

      if (error.code === 'ER_INSUFFICIENT_BALANCE' || 
          error.sqlState === '45000' && error.message.includes('Insufficient wallet balance')) {
        return NextResponse.json(
          { error: 'Insufficient wallet balance' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create booking: ' + (error.message || 'Unknown error') },
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