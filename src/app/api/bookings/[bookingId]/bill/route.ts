import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    const connection = await getConnection();

    try {
      // Get itemized bill details
      const [results] = await connection.execute(
        'CALL ItemizedBill(?)',
        [bookingId]
      );

      const bill = (results as any[])[0][0];
      if (!bill) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ticketId: bill.TicketID,
        pnr: bill.PNR,
        journeyDate: bill.JourneyDate,
        trainName: bill.TrainName,
        coachType: bill.CoachType,
        baseFare: bill.BaseFare,
        totalFare: bill.TotalFare,
        additionalCharges: bill.AdditionalCharges,
        breakdown: {
          baseCost: bill.BaseFare,
          serviceCharge: bill.AdditionalCharges * 0.3, // 30% of additional charges
          convenienceFee: bill.AdditionalCharges * 0.2, // 20% of additional charges
          gst: bill.AdditionalCharges * 0.5, // 50% of additional charges
        }
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error fetching bill details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill details' },
      { status: 500 }
    );
  }
}