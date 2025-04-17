'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Register() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phonePrimary: '',
    phoneSecondary: '',
    paymentType: 'none',
    cardNumber: '',
    cardExpiry: '',
    cardHolderName: '',
    upiId: ''
  });

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser && parsedUser.UserID) { // Updated from userId to UserID
          router.push('/');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.username || !formData.password || !formData.email || !formData.phonePrimary) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (formData.paymentType === 'card') {
      if (!formData.cardNumber || !formData.cardExpiry || !formData.cardHolderName) {
        setError('Please fill in all card details');
        return false;
      }
      if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        setError('Invalid card number');
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        setError('Invalid expiry date (MM/YY)');
        return false;
      }
    } else if (formData.paymentType === 'upi') {
      if (!formData.upiId) {
        setError('Please enter UPI ID');
        return false;
      }
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/i.test(formData.upiId)) {
        setError('Invalid UPI ID');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim(),
          phonePrimary: formData.phonePrimary,
          phoneSecondary: formData.phoneSecondary || null,
          cardNumber: formData.paymentType === 'card' ? formData.cardNumber : null,
          cardHolderName: formData.paymentType === 'card' ? formData.cardHolderName : null,
          cardExpiry: formData.paymentType === 'card' ? formData.cardExpiry : null,
          upiId: formData.paymentType === 'upi' ? formData.upiId : null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1>Create Account</h1>
        <p className={styles.subtitle}>Join us to book train tickets easily</p>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${currentStep === 1 ? styles.active : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            Basic Details
          </button>
          <button 
            className={`${styles.tab} ${currentStep === 2 ? styles.active : ''}`}
            onClick={() => validateStep1() && setCurrentStep(2)}
          >
            Payment Setup
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {currentStep === 1 ? (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username*</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password*</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password*</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phonePrimary">Primary Phone*</label>
                <input
                  type="tel"
                  id="phonePrimary"
                  name="phonePrimary"
                  value={formData.phonePrimary}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phoneSecondary">Secondary Phone (Optional)</label>
                <input
                  type="tel"
                  id="phoneSecondary"
                  name="phoneSecondary"
                  value={formData.phoneSecondary}
                  onChange={handleInputChange}
                />
              </div>

              <button 
                type="button" 
                onClick={handleNext}
                className={styles.submitButton}
              >
                Next
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.sectionTitle}>Payment Method (Optional)</h2>
              <div className={styles.formGroup}>
                <select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                  className={styles.select}
                >
                  <option value="none">No payment method</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              {formData.paymentType === 'card' && (
                <div className={styles.paymentSection}>
                  <div className={styles.formGroup}>
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="cardExpiry">Expiry Date (MM/YY)</label>
                    <input
                      type="text"
                      id="cardExpiry"
                      name="cardExpiry"
                      value={formData.cardExpiry}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="cardHolderName">Card Holder Name</label>
                    <input
                      type="text"
                      id="cardHolderName"
                      name="cardHolderName"
                      value={formData.cardHolderName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {formData.paymentType === 'upi' && (
                <div className={styles.paymentSection}>
                  <div className={styles.formGroup}>
                    <label htmlFor="upiId">UPI ID</label>
                    <input
                      type="text"
                      id="upiId"
                      name="upiId"
                      value={formData.upiId}
                      onChange={handleInputChange}
                      placeholder="username@upi"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.loginLink}>
            Already have an account?{' '}
            <button 
              type="button"
              onClick={() => router.push('/login')}
              className={styles.linkButton}
            >
              Login here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}