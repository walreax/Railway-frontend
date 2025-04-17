import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  req: NextRequest,
  { params }: { params: { trainId: string } }
) {
  try {
    const { trainId } = params;

    const connection = await getConnection();

    try {
      // Get waitlisted passengers for the train
      const [results] = await connection.execute<RowDataPacket[][]>(
        'CALL GetWaitlistedPassengers(?)',
        [trainId]
      );

      const waitlist = (results[0] as RowDataPacket[]).map((passenger: any) => ({
        passengerId: passenger.PassengerID,
        name: passenger.Name,
        age: passenger.Age,
        gender: passenger.Gender,
        position: parseInt(passenger.SeatAllocation.split('-')[1]),
        status: passenger.BookingStatus
      }));

      return NextResponse.json({
        count: waitlist.length,
        passengers: waitlist
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist information' },
      { status: 500 }
    );
  }
}