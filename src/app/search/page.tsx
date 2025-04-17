'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

interface Station {
  StationCode: string;
  StationName: string;
}

interface Coach {
  type: string;
  available: number;
  fare: number;
}

interface Train {
  trainId: number;
  trainNumber: string;
  trainName: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: number;
  runningDays: string[];
  coaches: Coach[];
  availabilityStatus: 'high' | 'medium' | 'low';
}

export default function Search() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchData, setSearchData] = useState({
    fromStation: '',
    toStation: '',
    journeyDate: '',
    coachType: ''
  });

  useEffect(() => {
    const fetchStations = async () => {
      setStationsLoading(true);
      try {
        const response = await fetch('/api/stations');
        const data = await response.json();
        if (response.ok) {
          setStations(data);
        } else {
          setError('Failed to fetch stations. Please refresh the page.');
        }
      } catch (error) {
        setError('Network error while fetching stations.');
      } finally {
        setStationsLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Define coach types with their descriptions
  const coachTypes = [
    {
      value: '1A',
      label: '1st AC',
      description: 'Premium air-conditioned coach'
    },
    {
      value: '2A',
      label: '2nd AC',
      description: 'Two-tier air-conditioned coach'
    },
    {
      value: '3A',
      label: '3rd AC',
      description: 'Three-tier air-conditioned coach'
    },
    {
      value: 'SL',
      label: 'Sleeper',
      description: 'Non-AC sleeper coach'
    },
    {
      value: 'CC',
      label: 'Chair Car',
      description: 'Air-conditioned seating coach'
    },
    {
      value: 'EC',
      label: 'Executive Chair Car',
      description: 'Premium seating coach'
    },
    {
      value: '2S',
      label: 'Second Seating',
      description: 'Non-AC seating coach'
    },
    {
      value: 'GN',
      label: 'General',
      description: 'Unreserved general coach'
    }
  ];

  const validateForm = () => {
    // Reset error state
    setError('');

    // Check if stations are selected
    if (!searchData.fromStation || !searchData.toStation) {
      setError('Please select both source and destination stations');
      return false;
    }

    // Check if source and destination are different
    if (searchData.fromStation === searchData.toStation) {
      setError('Source and destination stations cannot be the same');
      return false;
    }

    // Validate journey date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(searchData.journeyDate);
    if (selectedDate < today) {
      setError('Journey date cannot be in the past');
      return false;
    }

    // Validate if date is not more than 4 months in advance
    const fourMonthsFromNow = new Date();
    fourMonthsFromNow.setMonth(fourMonthsFromNow.getMonth() + 4);
    if (selectedDate > fourMonthsFromNow) {
      setError('Cannot book tickets more than 4 months in advance');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setTrains([]);

    try {
      const queryParams = new URLSearchParams({
        from: searchData.fromStation,
        to: searchData.toStation,
        date: searchData.journeyDate,
        coachType: searchData.coachType
      });

      const response = await fetch(`/api/trains/search?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search trains');
      }

      if (data.trains?.length === 0) {
        setError('No trains found for the selected criteria');
        return;
      }

      setTrains(data.trains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search trains. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (train: Train, selectedCoach: Coach) => {
    const bookingData = {
      trainId: train.trainId,
      date: searchData.journeyDate,
      from: searchData.fromStation,
      to: searchData.toStation,
      class: selectedCoach.type
    };

    const user = localStorage.getItem('user');
    if (!user) {
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      router.push('/login');
      return;
    }

    const params = new URLSearchParams(bookingData);
    router.push(`/bookings/new?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <h1>Search Trains</h1>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="fromStation">From</label>
            <select
              id="fromStation"
              value={searchData.fromStation}
              onChange={e => setSearchData({ ...searchData, fromStation: e.target.value })}
              required
              className={styles.stationSelect}
            >
              <option value="">Select departure station</option>
              {stations.map(station => (
                <option key={station.StationCode} value={station.StationCode}>
                  {station.StationName} ({station.StationCode})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="toStation">To</label>
            <select
              id="toStation"
              value={searchData.toStation}
              onChange={e => setSearchData({ ...searchData, toStation: e.target.value })}
              required
              className={styles.stationSelect}
            >
              <option value="">Select destination station</option>
              {stations.map(station => (
                <option key={station.StationCode} value={station.StationCode}>
                  {station.StationName} ({station.StationCode})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="journeyDate">Journey Date</label>
            <input
              type="date"
              id="journeyDate"
              value={searchData.journeyDate}
              onChange={e => setSearchData({ ...searchData, journeyDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="coachType">Coach Type (Optional)</label>
            <select
              id="coachType"
              value={searchData.coachType}
              onChange={e => setSearchData({ ...searchData, coachType: e.target.value })}
              className={styles.stationSelect}
            >
              <option value="">Select Coach Type</option>
              {coachTypes.map(coach => (
                <option key={coach.value} value={coach.value}>
                  {coach.label} - {coach.description}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.searchButton} disabled={loading}>
            {loading ? 'Searching...' : 'Search Trains'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}
      </div>

      {trains && trains.length > 0 && (
        <div className={styles.resultsSection}>
          <h2>Available Trains</h2>
          <div className={styles.trainList}>
            {trains.map(train => (
              <div key={train.trainId} className={styles.trainCard}>
                <div className={styles.trainHeader}>
                  <div>
                    <h3>{train.trainName}</h3>
                    <div className={styles.trainNumber}>Train #{train.trainNumber}</div>
                  </div>
                  <div className={styles.availabilityBadge + ' ' + styles[train.availabilityStatus]}>
                    {train.availabilityStatus === 'high' ? 'High Availability' :
                     train.availabilityStatus === 'medium' ? 'Limited Seats' :
                     'Few Seats Left'}
                  </div>
                </div>

                <div className={styles.journeyDetails}>
                  <div className={styles.station}>
                    <div className={styles.time}>{train.departureTime}</div>
                    <div className={styles.stationName}><strong>From:</strong> {train.fromStation}</div>
                  </div>
                  
                  <div className={styles.duration}>
                    <span className={styles.arrow}>→</span>
                    <div className={styles.durationTime}>{train.duration}</div>
                  </div>

                  <div className={styles.station}>
                    <div className={styles.time}>{train.arrivalTime}</div>
                    <div className={styles.stationName}><strong>To:</strong> {train.toStation}</div>
                  </div>
                </div>

                <div className={styles.coachDetails}>
                  {train.coaches.map(coach => (
                    <div key={`${train.trainId}-${coach.type}`} className={styles.coachInfo}>
                      <div>
                        <div className={styles.coachLabel}>
                          {coachTypes.find(ct => ct.value === coach.type)?.label}
                        </div>
                        <div className={styles.coachDescription}>
                          {coachTypes.find(ct => ct.value === coach.type)?.description}
                        </div>
                        <div className={`${styles.availability} ${styles[coach.available > 20 ? 'high' : coach.available > 10 ? 'medium' : 'low']}`}>
                          {coach.available} seats available
                        </div>
                      </div>
                      <div className={styles.fareInfo}>
                        <div className={styles.fareAmount}>₹{coach.fare}</div>
                      </div>
                      <button 
                        onClick={() => handleBooking(train, coach)}
                        className={styles.bookButton}
                      >
                        Book {coachTypes.find(ct => ct.value === coach.type)?.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}