import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const connection = await getConnection();
    
    try {
      // Get distinct stations from TrainStops table
      const [results] = await connection.execute(`
        SELECT DISTINCT 
          StationName as StationCode,
          StationName as StationName
        FROM TrainStops 
        ORDER BY StationName
      `);
      
      return NextResponse.json(Array.isArray(results) ? results : []);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}