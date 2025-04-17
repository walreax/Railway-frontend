"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser && parsedUser.UserID) { // Updated from userId to UserID
          router.push('/');
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem('user'); // Clear invalid user data
      }
    }
  }, [router]);

  const validateForm = () => {
    return true; // Removed all client-side constraints
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.refresh(); // Refresh to update Header component

        // Check for pending booking
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        if (pendingBooking) {
          const booking = JSON.parse(pendingBooking);
          sessionStorage.removeItem('pendingBooking'); // Clear the pending booking
          router.push(
            `/bookings/new?trainId=${booking.trainId}&date=${booking.date}&from=${booking.from}&to=${booking.to}&class=${booking.class}`
          );
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1>Welcome Back</h1>
        <p className={styles.subtitle}>Please login to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className={styles.registerLink}>
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => router.push('/register')}
              className={styles.linkButton}
            >
              Register here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}