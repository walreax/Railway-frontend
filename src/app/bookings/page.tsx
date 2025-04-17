"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Passenger {
  name: string;
  age: number;
}

interface PaymentInfo {
  method: 'wallet' | 'card' | 'upi';
  cardNumber?: string;
  upiId?: string;
}

interface Booking {
  bookingId: number;
  pnr: string;
  trainName: string;
  trainNumber: string;
  fromStation: string;
  toStation: string;
  journeyDate: string;
  fare: number;
  status: string;
  payment: PaymentInfo;
  passengers: Passenger[];
}

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userStr);
        if (!user?.UserID) {
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }

        await fetchBookings(user.UserID);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load bookings');
        setLoading(false);
      }
    };

    fetchData();
  }, [router, filters]); // Add filters as dependency

  const fetchBookings = async (userId: string) => {
    setLoading(true);
    setError('');

    try {
      let url = `/api/bookings/user/${userId}`;
      const queryParams = new URLSearchParams();
      
      if (filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      if (filters.fromDate) {
        queryParams.append('fromDate', filters.fromDate);
      }
      if (filters.toDate) {
        queryParams.append('toDate', filters.toDate);
      }

      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to cancel booking');

      const { message, refundAmount, refundedTo } = await response.json();

      // Update the booking status in the UI
      setBookings(bookings.map(booking => 
        booking.bookingId === bookingId 
          ? { ...booking, status: 'Cancelled' }
          : booking
      ));

      alert(`Booking cancelled successfully. Refund amount: ₹${refundAmount} (Refunded to ${refundedTo})`);
    } catch (err) {
      alert('Failed to cancel booking. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => router.push('/')} className={styles.searchButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>My Bookings</h1>

      {bookings.length === 0 ? (
        <div className={styles.noBookings}>
          <p>You haven't made any bookings yet.</p>
          <button onClick={() => router.push('/')} className={styles.searchButton}>
            Search Trains
          </button>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {bookings.map((booking) => (
            <div key={booking.bookingId} className={styles.bookingCard}>
              <div className={styles.bookingHeader}>
                <div>
                  <h2>{booking.trainName}</h2>
                  <p className={styles.trainNumber}>Train No: {booking.trainNumber}</p>
                  <p className={styles.pnr}>PNR: {booking.pnr}</p>
                </div>
                <div className={styles.status} data-status={booking.status.toLowerCase()}>
                  {booking.status}
                </div>
              </div>

              <div className={styles.journeyInfo}>
                <div className={styles.stations}>
                  <div>
                    <p className={styles.station}>{booking.fromStation}</p>
                  </div>
                  <div className={styles.arrow}>→</div>
                  <div>
                    <p className={styles.station}>{booking.toStation}</p>
                  </div>
                </div>
                <div className={styles.dateInfo}>
                  <p>Journey Date: {new Date(booking.journeyDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className={styles.passengerInfo}>
                <h3>Passengers</h3>
                <div className={styles.passengers}>
                  {booking.passengers && booking.passengers.map((passenger, index) => (
                    <div key={index} className={styles.passenger}>
                      <span>{passenger.name}</span>
                      <span>{passenger.age} years</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.paymentInfo}>
                <h3>Payment Details</h3>
                <div className={styles.paymentDetails}>
                  <div className={styles.paymentMethod}>
                    {booking.payment.method === 'wallet' && (
                      <span>Paid using Wallet</span>
                    )}
                    {booking.payment.method === 'card' && (
                      <span>Paid using Card {booking.payment.cardNumber}</span>
                    )}
                    {booking.payment.method === 'upi' && (
                      <span>Paid using UPI ({booking.payment.upiId})</span>
                    )}
                  </div>
                  <div className={styles.fareAmount}>₹{booking.fare}</div>
                </div>
              </div>

              {booking.status === 'confirmed' && (
                <div className={styles.actions}>
                  <button
                    onClick={() => handleCancelBooking(booking.bookingId)}
                    className={styles.cancelButton}
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}