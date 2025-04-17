import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // Get revenue for date range
      const [revenueResults] = await connection.execute<RowDataPacket[][]>(
        'CALL RevenueFromBookings(?, ?)',
        [startDate, endDate]
      );

      // Get busiest route
      const [routeResults] = await connection.execute<RowDataPacket[][]>(
        'CALL BusiestRoute()'
      );

      const revenue = (revenueResults[0] as RowDataPacket[])[0];
      const route = (routeResults[0] as RowDataPacket[])[0];

      return NextResponse.json({
        totalRevenue: revenue.TotalRevenue || 0,
        busiestRoute: route ? {
          from: route.FromStation,
          to: route.ToStation,
          totalPassengers: route.TotalPassengers
        } : null,
        period: {
          from: startDate,
          to: endDate
        }
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue information' },
      { status: 500 }
    );
  }
}