import { NextResponse } from 'next/server';
import { createConnection } from 'mysql2/promise';

export async function GET(
  request: Request,
  { params }: { params: { trainId: string } }
) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!date || !from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: date, from, to' },
      { status: 400 }
    );
  }

  const trainId = params.trainId;

  try {
    const connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'Railway_DB',
    });

    try {
      // Get basic train information
      const [trainResults] = await connection.execute<any[]>(
        `SELECT 
          t.TrainID, t.TrainNumber, t.TrainName,
          origin.StationName as FromStation,
          origin.DepartureTime,
          dest.StationName as ToStation,
          dest.ArrivalTime,
          dest.Distance - origin.Distance as Distance
        FROM Trains t
        JOIN TrainSchedule ts ON t.TrainID = ts.TrainID
        JOIN TrainStops origin ON ts.ScheduleID = origin.ScheduleID
        JOIN TrainStops dest ON ts.ScheduleID = dest.ScheduleID
        WHERE t.TrainID = ?
          AND origin.StationName = ?
          AND dest.StationName = ?
          AND origin.StopNumber < dest.StopNumber
          AND ts.Status = 'active'`,
        [trainId, from, to]
      );

      if (trainResults.length === 0) {
        return NextResponse.json(
          { error: 'Train not found or not available for the selected route' },
          { status: 404 }
        );
      }

      const train = trainResults[0];

      // Get coach details with availability
      const [coachResults] = await connection.execute<any[]>(
        `SELECT 
          c.CoachType,
          COUNT(CASE WHEN s.IsAvailable = 1 THEN 1 END) as AvailableSeats,
          ROUND(c.BaseFare * ? / 100, 2) as Fare
        FROM Coaches c
        LEFT JOIN Seats s ON c.CoachID = s.CoachID 
          AND s.JourneyDate = ? 
          AND s.ScheduleID = (
            SELECT ScheduleID FROM TrainSchedule WHERE TrainID = ? LIMIT 1
          )
        WHERE c.TrainID = ?
        GROUP BY c.CoachType, c.BaseFare`,
        [train.Distance, date, trainId, trainId]
      );

      const trainDetails = {
        trainId: train.TrainID,
        trainNumber: train.TrainNumber,
        trainName: train.TrainName,
        fromStation: train.FromStation,
        toStation: train.ToStation,
        departureTime: train.DepartureTime,
        arrivalTime: train.ArrivalTime,
        distance: train.Distance,
        coachDetails: coachResults.map(coach => ({
          type: coach.CoachType,
          availableSeats: coach.AvailableSeats || 0,
          fare: Math.round(coach.Fare) // Round to nearest integer
        }))
      };

      return NextResponse.json(trainDetails);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching train details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch train details' },
      { status: 500 }
    );
  }
}