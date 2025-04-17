import { NextResponse } from 'next/server';
import { createConnection } from 'mysql2/promise';

interface TrainResult {
  trainId: number;
  trainNumber: string;
  trainName: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: number;
  runningDays: string;
  coaches: {
    type: string;
    available: number;
    fare: number;
  }[];
  availabilityStatus: 'high' | 'medium' | 'low';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');
  const coachType = searchParams.get('coachType');

  if (!from || !to || !date) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Railway_DB',
  });

  try {
    const [trains] = await connection.execute<any[]>(
      `SELECT DISTINCT
        t.TrainID, t.TrainNumber, t.TrainName,
        origin.StationName as FromStation,
        origin.DepartureTime,
        dest.StationName as ToStation,
        dest.ArrivalTime,
        dest.Distance - origin.Distance as Distance,
        ts.RunningDays
      FROM Trains t
      JOIN TrainSchedule ts ON t.TrainID = ts.TrainID
      JOIN TrainStops origin ON ts.ScheduleID = origin.ScheduleID
      JOIN TrainStops dest ON ts.ScheduleID = dest.ScheduleID
      WHERE origin.StationName = ?
        AND dest.StationName = ?
        AND origin.StopNumber < dest.StopNumber
        AND ts.Status = 'active'
        AND ts.RunningDays LIKE CONCAT('%', LEFT(DAYNAME(?), 3), '%')`,
      [from, to, date]
    );

    const formattedTrains: TrainResult[] = await Promise.all(
      trains.map(async (train) => {
        // Get coach availability
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
          ${coachType ? 'AND c.CoachType = ?' : ''}
          GROUP BY c.CoachType, c.BaseFare`,
          coachType 
            ? [train.Distance, date, train.TrainID, train.TrainID, coachType]
            : [train.Distance, date, train.TrainID, train.TrainID]
        );

        const coaches = coachResults.map(coach => ({
          type: coach.CoachType,
          available: coach.AvailableSeats || 0,
          fare: Math.round(coach.Fare) // Round to nearest integer
        }));

        // Calculate availability status per coach type
        const getAvailabilityStatus = (available: number, coachType: string) => {
          const thresholds = {
            '1A': { high: 15, medium: 8 },
            '2A': { high: 30, medium: 15 },
            '3A': { high: 45, medium: 20 },
            'SL': { high: 60, medium: 30 },
            'CC': { high: 50, medium: 25 },
            'EC': { high: 40, medium: 20 },
            '2S': { high: 70, medium: 35 },
            'GN': { high: 80, medium: 40 }
          };
          
          const threshold = thresholds[coachType as keyof typeof thresholds] || 
                          { high: 50, medium: 25 };
          
          return available > threshold.high ? 'high' :
                 available > threshold.medium ? 'medium' : 'low';
        };

        // Overall train availability is based on the worst availability among coaches
        const availabilityStatus = coaches.reduce((status, coach) => {
          const coachStatus = getAvailabilityStatus(coach.available, coach.type);
          if (status === 'high' && coachStatus !== 'high') return coachStatus;
          if (status === 'medium' && coachStatus === 'low') return 'low';
          return status;
        }, 'high' as 'high' | 'medium' | 'low');

        // Calculate duration
        const dept = new Date(`2000-01-01 ${train.DepartureTime}`);
        const arrv = new Date(`2000-01-01 ${train.ArrivalTime}`);
        if (arrv < dept) arrv.setDate(arrv.getDate() + 1);
        const duration = `${Math.floor((arrv.getTime() - dept.getTime()) / 3600000)}h ${Math.floor(((arrv.getTime() - dept.getTime()) % 3600000) / 60000)}m`;

        return {
          trainId: train.TrainID,
          trainNumber: train.TrainNumber,
          trainName: train.TrainName,
          fromStation: train.FromStation,
          toStation: train.ToStation,
          departureTime: train.DepartureTime,
          arrivalTime: train.ArrivalTime,
          duration,
          distance: train.Distance,
          runningDays: train.RunningDays,
          coaches,
          availabilityStatus
        };
      })
    );

    return NextResponse.json({ trains: formattedTrains });
  } catch (error) {
    console.error('Error searching trains:', error);
    return NextResponse.json(
      { error: 'Failed to search trains' },
      { status: 500 }
    );
  } finally {
    await connection.end();
  }
}