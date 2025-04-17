import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/utils/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { id } = params;
    const connection = await getConnection();

    try {
      // Soft delete the payment method
      const [result] = await connection.execute(
        'UPDATE PaymentDetails SET IsActive = FALSE WHERE PaymentID = ? AND UserID = ?',
        [id, userId]
      );

      // Check if any row was affected
      const rowsAffected = (result as any).affectedRows;
      if (!rowsAffected) {
        return NextResponse.json(
          { error: 'Payment method not found or already deleted' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payment method removed successfully'
      });
    } catch (error) {
      console.error('Error removing payment method:', error);
      return NextResponse.json(
        { error: 'Failed to remove payment method' },
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