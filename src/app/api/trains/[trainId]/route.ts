import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';
import { RowDataPacket } from 'mysql2';

interface TrainResult extends RowDataPacket {
  TrainID: number;
  TrainNumber: string;
  TrainName: string;
  FromStation: string;
  ToStation: string;
  DepartureTime: string;
  ArrivalTime: string;
  Distance: number;
  RunningDays: string;
  SLAvailable: number;
  ACThreeAvailable: number;
  ACTwoAvailable: number;
  ACOneAvailable: number;
  BaseFare: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { trainId: string } }
) {
  try {
    const { trainId } = params;
    const searchParams = new URL(req.url).searchParams;
    const date = searchParams.get('date');
    const fromStation = searchParams.get('from');
    const toStation = searchParams.get('to');

    if (!date || !fromStation || !toStation) {
      return NextResponse.json(
        { error: 'Date, source and destination stations are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // Get train details with coach availability for the specific journey
      const [results] = await connection.execute<TrainResult[]>(
        'CALL sp_GetTrainAvailabilityDetails(?, ?, ?, ?)',
        [trainId, fromStation, toStation, date]
      );

      if (!results[0]?.length) {
        return NextResponse.json(
          { error: 'Train not found or not available for selected route/date' },
          { status: 404 }
        );
      }

      const trainDetails = results[0][0];
      const totalAvailable = (trainDetails.SLAvailable || 0) + 
                           (trainDetails.ACThreeAvailable || 0) + 
                           (trainDetails.ACTwoAvailable || 0) + 
                           (trainDetails.ACOneAvailable || 0);

      let availabilityStatus: 'high' | 'medium' | 'low';
      if (totalAvailable > 50) {
        availabilityStatus = 'high';
      } else if (totalAvailable > 20) {
        availabilityStatus = 'medium';
      } else {
        availabilityStatus = 'low';
      }

      // Format the response
      const formattedResponse = {
        trainId: trainDetails.TrainID,
        trainNumber: trainDetails.TrainNumber,
        trainName: trainDetails.TrainName,
        fromStation: trainDetails.FromStation,
        toStation: trainDetails.ToStation,
        departureTime: trainDetails.DepartureTime?.slice(0, 5),
        arrivalTime: trainDetails.ArrivalTime?.slice(0, 5),
        duration: calculateDuration(trainDetails.DepartureTime, trainDetails.ArrivalTime),
        distance: trainDetails.Distance,
        runningDays: trainDetails.RunningDays?.split(','),
        coaches: [
          {
            type: 'SL',
            available: trainDetails.SLAvailable,
            fare: Math.round(trainDetails.BaseFare * 1.0)
          },
          {
            type: '3A',
            available: trainDetails.ACThreeAvailable,
            fare: Math.round(trainDetails.BaseFare * 1.75)
          },
          {
            type: '2A',
            available: trainDetails.ACTwoAvailable,
            fare: Math.round(trainDetails.BaseFare * 2.5)
          },
          {
            type: '1A',
            available: trainDetails.ACOneAvailable,
            fare: Math.round(trainDetails.BaseFare * 3.5)
          }
        ].filter(coach => coach.available > 0), // Only include coaches with available seats
        availabilityStatus
      };

      return NextResponse.json(formattedResponse);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching train details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch train details' },
      { status: 500 }
    );
  }
}

function calculateDuration(departure: string, arrival: string): string {
  const departureTime = new Date(`1970-01-01T${departure}`);
  const arrivalTime = new Date(`1970-01-01T${arrival}`);
  
  // Handle cases where arrival is next day
  if (arrivalTime < departureTime) {
    arrivalTime.setDate(arrivalTime.getDate() + 1);
  }

  const diff = arrivalTime.getTime() - departureTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}