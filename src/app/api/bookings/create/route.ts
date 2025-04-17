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

    // Format passenger details for stored procedure
    const passengerNames = booking.passengers.map(p => p.name).join(', ');
    const passengerAges = booking.passengers.map(p => p.age).join(', ');
    const passengerGenders = booking.passengers.map(p => p.gender).join(', ');

    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Call stored procedure to create booking
      const [results] = await connection.execute(
        'CALL sp_CreateBooking(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @p_BookingID)',
        [
          userId,
          booking.trainId,
          booking.fromStation,
          booking.toStation,
          booking.journeyDate,
          booking.coachType,
          passengerNames,
          passengerAges,
          passengerGenders,
          booking.paymentMethod
        ]
      );

      // Get the output parameter
      const [outputResults] = await connection.execute('SELECT @p_BookingID as bookingId');
      const bookingId = (outputResults as any[])[0].bookingId;

      if (!bookingId) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Failed to create booking' },
          { status: 500 }
        );
      }

      await connection.commit();
      return NextResponse.json({ bookingId });

    } catch (error: any) {
      await connection.rollback();
      console.error('Error creating booking:', error);
      
      if (error.code === 'ER_NO_SEATS') {
        return NextResponse.json(
          { error: 'No seats available' },
          { status: 400 }
        );
      }

      if (error.code === 'ER_INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          { error: 'Insufficient wallet balance' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create booking' },
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