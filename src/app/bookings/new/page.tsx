'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

interface PassengerForm {
  name: string;
  age: string;
  gender: 'M' | 'F' | 'O';
}

interface TrainDetails {
  trainName: string;
  trainNumber: string;
  departureTime: string;
  arrivalTime: string;
  coachDetails: {
    type: string;
    availableSeats: number;
    fare: number;
  }[];
}

export default function NewBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [trainDetails, setTrainDetails] = useState<TrainDetails | null>(null);
  const [fetchRetried, setFetchRetried] = useState(false);

  const [formData, setFormData] = useState({
    trainId: searchParams.get('trainId') || '',
    fromStation: searchParams.get('from') || '',
    toStation: searchParams.get('to') || '',
    journeyDate: searchParams.get('date') || '',
    coachType: searchParams.get('class') || '',
    passengers: [{ name: '', age: '', gender: 'M' as const }],
    paymentMethod: 'wallet'
  });

  // Fetch train details on load with a retry mechanism
  useEffect(() => {
    const fetchTrainDetails = async () => {
      if (!formData.trainId) {
        setError('Missing train ID');
        setLoading(false);
        return;
      }
      
      if (!formData.fromStation || !formData.toStation || !formData.journeyDate) {
        setError('Missing journey details');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Add query parameters for source and destination stations
        const queryParams = new URLSearchParams({
          date: formData.journeyDate,
          from: formData.fromStation,
          to: formData.toStation
        });
        
        // Set a timeout to abort the fetch if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `/api/trains/${formData.trainId}?${queryParams.toString()}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch train details: ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.coachDetails || data.coachDetails.length === 0) {
          throw new Error('No coach details available');
        }

        setTrainDetails(data);
        
        // Set default coach type if not already set
        if (!formData.coachType && data.coachDetails.length > 0) {
          setFormData(prev => ({ ...prev, coachType: data.coachDetails[0].type }));
        }
      } catch (err) {
        console.error('Error fetching train details:', err);
        if (!fetchRetried) {
          // Wait 2 seconds and try one more time
          setTimeout(() => {
            setFetchRetried(true);
            fetchTrainDetails();
          }, 2000);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load train details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrainDetails();
  }, [formData.trainId, formData.fromStation, formData.toStation, formData.journeyDate, fetchRetried]);

  const handleAddPassenger = () => {
    if (formData.passengers.length >= 6) {
      setError('Maximum 6 passengers allowed per booking');
      return;
    }
    setFormData(prev => ({
      ...prev,
      passengers: [...prev.passengers, { name: '', age: '', gender: 'M' as const }]
    }));
  };

  const handleRemovePassenger = (index: number) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index)
    }));
  };

  const handlePassengerChange = (index: number, field: keyof PassengerForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers.map((p, i) => 
        i === index 
          ? { ...p, [field]: value }
          : p
      )
    }));
  };

  const validateForm = () => {
    if (!formData.trainId || !formData.fromStation || !formData.toStation || 
        !formData.journeyDate || !formData.coachType) {
      setError('Missing journey details');
      return false;
    }

    for (const passenger of formData.passengers) {
      if (!passenger.name || !passenger.age || !passenger.gender) {
        setError('Please fill all passenger details');
        return false;
      }
      const age = parseInt(passenger.age);
      if (isNaN(age) || age < 1 || age > 120) {
        setError('Invalid passenger age');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userData);
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.UserID
        },
        body: JSON.stringify({
          ...formData,
          passengers: formData.passengers.map(p => ({
            ...p,
            age: parseInt(p.age)
          }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/bookings/${data.bookingId}`);
      } else {
        setError(data.error || 'Booking failed');
      }
    } catch (err) {
      setError('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.bookingCard}>
          <h1>Book Train Tickets</h1>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Fetching train details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !trainDetails) {
    return (
      <div className={styles.container}>
        <div className={styles.bookingCard}>
          <h1>Book Train Tickets</h1>
          <div className={styles.errorSection}>
            <p className={styles.error}>{error}</p>
            <button 
              onClick={() => {
                setFetchRetried(false);
                setError('');
                setLoading(true);
              }} 
              className={styles.retryButton}
            >
              Retry
            </button>
            <button 
              onClick={() => router.push('/search')} 
              className={styles.backButton}
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!trainDetails) {
    return (
      <div className={styles.container}>
        <div className={styles.bookingCard}>
          <h1>Book Train Tickets</h1>
          <div className={styles.errorSection}>
            <p className={styles.error}>Could not load train details</p>
            <button 
              onClick={() => router.push('/search')} 
              className={styles.backButton}
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.bookingCard}>
        <h1>Book Train Tickets</h1>

        <div className={styles.journeyInfo}>
          <div className={styles.trainInfo}>
            <h3>{trainDetails.trainName}</h3>
            <p className={styles.trainNumber}>#{trainDetails.trainNumber}</p>
          </div>

          <div className={styles.journeyDetails}>
            <div className={styles.station}>
              <p className={styles.time}>{trainDetails.departureTime}</p>
              <p>{formData.fromStation}</p>
            </div>
            <div className={styles.arrow}>→</div>
            <div className={styles.station}>
              <p className={styles.time}>{trainDetails.arrivalTime}</p>
              <p>{formData.toStation}</p>
            </div>
          </div>

          <p className={styles.date}>
            {new Date(formData.journeyDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.coachSelection}>
            <h3>Select Coach Type</h3>
            <div className={styles.coachTypes}>
              {trainDetails.coachDetails.map(coach => (
                <label 
                  key={coach.type} 
                  className={`${styles.coachOption} ${formData.coachType === coach.type ? styles.selected : ''}`}
                >
                  <input
                    type="radio"
                    name="coachType"
                    value={coach.type}
                    checked={formData.coachType === coach.type}
                    onChange={e => setFormData(prev => ({ ...prev, coachType: e.target.value }))}
                  />
                  <div className={styles.coachInfo}>
                    <span className={styles.coachType}>{coach.type}</span>
                    <span className={styles.fare}>₹{coach.fare}</span>
                    <span className={styles.seats}>{coach.availableSeats} seats available</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.passengersSection}>
            <div className={styles.sectionHeader}>
              <h3>Passenger Details</h3>
              <button 
                type="button" 
                onClick={handleAddPassenger}
                className={styles.addButton}
                disabled={formData.passengers.length >= 6}
              >
                Add Passenger
              </button>
            </div>

            {formData.passengers.map((passenger, index) => (
              <div key={index} className={styles.passengerForm}>
                <div className={styles.passengerHeader}>
                  <h4>Passenger {index + 1}</h4>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePassenger(index)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor={`name-${index}`}>Name</label>
                    <input
                      type="text"
                      id={`name-${index}`}
                      value={passenger.name}
                      onChange={e => handlePassengerChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor={`age-${index}`}>Age</label>
                    <input
                      type="number"
                      id={`age-${index}`}
                      value={passenger.age}
                      onChange={e => handlePassengerChange(index, 'age', e.target.value)}
                      min="1"
                      max="120"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Gender</label>
                    <div className={styles.genderOptions}>
                      {['M', 'F', 'O'].map(gender => (
                        <label key={gender} className={styles.genderOption}>
                          <input
                            type="radio"
                            name={`gender-${index}`}
                            value={gender}
                            checked={passenger.gender === gender}
                            onChange={e => handlePassengerChange(index, 'gender', e.target.value as 'M' | 'F' | 'O')}
                            required
                          />
                          <span>
                            {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.paymentSection}>
            <h3>Payment Method</h3>
            <div className={styles.paymentOptions}>
              <label className={styles.paymentOption}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={formData.paymentMethod === 'wallet'}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                />
                <span>Wallet</span>
              </label>
              <label className={styles.paymentOption}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                />
                <span>Credit/Debit Card</span>
              </label>
              <label className={styles.paymentOption}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={formData.paymentMethod === 'upi'}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                />
                <span>UPI</span>
              </label>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}