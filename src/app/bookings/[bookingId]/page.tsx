'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';

interface PassengerInfo {
  PassengerID: number;
  Name: string;
  Age: number;
  Gender: string;
  CoachType: string;
  SeatNumber: string | null;
  Status: 'Confirmed' | 'RAC' | 'WL';
}

interface BookingInfo {
  TicketID: number;
  PNR: string;
  UserID: number;
  TrainID: number;
  TrainName: string;
  TrainNumber: string;
  FromStation: string;
  ToStation: string;
  JourneyDate: string;
  BookingDate: string;
  TotalFare: number;
  Status: 'Confirmed' | 'RAC' | 'WL' | 'Cancelled';
  DepartureTime: string;
  ArrivalTime: string;
  passengers: PassengerInfo[];
}

export default function BookingDetails({ params }: { params: { bookingId: string } }) {
  const router = useRouter();
  const { bookingId } = params;
  
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userData);
        const response = await fetch(`/api/bookings/${bookingId}`, {
          headers: {
            'x-user-id': user.UserID
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Booking not found');
          } else if (response.status === 403) {
            setError('You do not have permission to view this booking');
          } else {
            setError('An error occurred while fetching booking details');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setBooking(data);
      } catch (err) {
        setError('Failed to load booking details. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, router]);

  const handleDownloadTicket = async () => {
    if (!booking) return;
    
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`/api/bookings/${bookingId}/bill`, {
        headers: {
          'x-user-id': user.UserID
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate ticket');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${booking.PNR}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      alert('Failed to download ticket. Please try again later.');
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'x-user-id': user.UserID,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Refresh booking data after cancellation
      const updatedBookingResponse = await fetch(`/api/bookings/${bookingId}`, {
        headers: {
          'x-user-id': user.UserID
        }
      });
      
      if (updatedBookingResponse.ok) {
        const updatedBooking = await updatedBookingResponse.json();
        setBooking(updatedBooking);
      }
      
      alert('Booking cancelled successfully. A refund has been initiated to your wallet.');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <Link href="/bookings" className={styles.backButton}>
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Booking Not Found</h2>
          <p>The requested booking could not be found.</p>
          <Link href="/bookings" className={styles.backButton}>
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const isCancellable = booking.Status !== 'Cancelled' && 
                        new Date(booking.JourneyDate) > new Date();
  
  const journeyDate = new Date(booking.JourneyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const bookingDate = new Date(booking.BookingDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={styles.container}>
      <div className={styles.bookingCard}>
        <div className={styles.bookingHeader}>
          <div>
            <h1>Booking Details</h1>
            <div className={styles.pnrSection}>
              <span className={styles.label}>PNR:</span>
              <span className={styles.pnr}>{booking.PNR}</span>
            </div>
          </div>
          <div className={`${styles.statusBadge} ${styles[booking.Status.toLowerCase()]}`}>
            {booking.Status}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Journey Information</h2>
          <div className={styles.journeyDetails}>
            <div className={styles.trainInfo}>
              <h3>{booking.TrainName}</h3>
              <p className={styles.trainNumber}>{booking.TrainNumber}</p>
            </div>

            <div className={styles.routeInfo}>
              <div className={styles.station}>
                <div className={styles.time}>{booking.DepartureTime}</div>
                <div className={styles.stationName}>{booking.FromStation}</div>
              </div>
              
              <div className={styles.routeLine}>
                <div className={styles.line}></div>
                <div className={styles.date}>{journeyDate}</div>
              </div>
              
              <div className={styles.station}>
                <div className={styles.time}>{booking.ArrivalTime}</div>
                <div className={styles.stationName}>{booking.ToStation}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Passenger Details</h2>
          <table className={styles.passengersTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age/Gender</th>
                <th>Coach/Seat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map(passenger => (
                <tr key={passenger.PassengerID}>
                  <td>{passenger.Name}</td>
                  <td>{passenger.Age} / {passenger.Gender}</td>
                  <td>
                    {passenger.CoachType}
                    {passenger.SeatNumber && ` / ${passenger.SeatNumber}`}
                  </td>
                  <td>
                    <span className={`${styles.statusChip} ${styles[passenger.Status.toLowerCase()]}`}>
                      {passenger.Status === 'WL' ? `WL${passenger.PassengerID}` : passenger.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment Details</h2>
          <div className={styles.paymentInfo}>
            <div className={styles.paymentRow}>
              <span>Booking Date:</span>
              <span>{bookingDate}</span>
            </div>
            <div className={styles.paymentRow}>
              <span>Total Fare:</span>
              <span className={styles.fare}>₹{booking.TotalFare}</span>
            </div>
            <div className={styles.paymentRow}>
              <span>Payment Method:</span>
              <span>Wallet</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.downloadButton}
            onClick={handleDownloadTicket}
          >
            Download E-Ticket
          </button>
          
          {isCancellable && (
            <button 
              className={styles.cancelButton}
              onClick={handleCancelBooking}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Cancel Booking'}
            </button>
          )}
          
          <Link href="/bookings" className={styles.backButton}>
            Back to My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}