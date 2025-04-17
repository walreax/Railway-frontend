'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi';
  details: {
    cardNumber?: string;
    cardHolderName?: string;
    cardExpiry?: string;
    upiId?: string;
  };
}

interface UserProfile {
  username: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  walletBalance: number;
  paymentMethods: PaymentMethod[];
}

interface NewPayment {
  type: 'card' | 'upi';
  cardNumber: string;
  cardHolderName: string;
  cardExpiry: string;
  upiId: string;
}

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<NewPayment>({
    type: 'card',
    cardNumber: '',
    cardHolderName: '',
    cardExpiry: '',
    upiId: ''
  });

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (!user || !user.UserID) { // Updated from userId to UserID
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }

        await fetchProfile(user.UserID); // Updated from userId to UserID
      } catch (err) {
        console.error('Error parsing user data:', err);
        localStorage.removeItem('user');
        router.push('/login');
      }
    };

    checkAuthAndFetchProfile();
  }, [router]);

  const fetchProfile = async (userId: string) => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setAddingFunds(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '');
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.UserID // Updated to match login response
        },
        body: JSON.stringify({ 
          amount: parseFloat(fundAmount) 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchProfile(user.UserID);
        setFundAmount('');
      } else {
        setError(data.error || 'Failed to add funds');
      }
    } catch (err) {
      setError('Failed to add funds');
    } finally {
      setAddingFunds(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setError('');

    if (newPayment.type === 'card') {
      if (!newPayment.cardNumber || !newPayment.cardHolderName || !newPayment.cardExpiry) {
        setError('Please fill all card details');
        return;
      }
      if (!/^\d{16}$/.test(newPayment.cardNumber.replace(/\s/g, ''))) {
        setError('Invalid card number');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(newPayment.cardExpiry)) {
        setError('Invalid expiry date (MM/YY)');
        return;
      }
    } else if (!newPayment.upiId) {
      setError('Please enter UPI ID');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '');
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.UserID // Updated to match login response
        },
        body: JSON.stringify(newPayment),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchProfile(user.UserID);
        setShowAddPayment(false);
        setNewPayment({
          type: 'card',
          cardNumber: '',
          cardHolderName: '',
          cardExpiry: '',
          upiId: ''
        });
      } else {
        setError(data.error || 'Failed to add payment method');
      }
    } catch (err) {
      setError('Failed to add payment method');
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '');
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.UserID // Updated to match login response
        }
      });

      if (response.ok) {
        await fetchProfile(user.UserID);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove payment method');
      }
    } catch (err) {
      setError('Failed to remove payment method');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className={styles.error}>
        {error || 'Failed to load profile. Please try again later.'}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.header}>
          <h1>My Profile</h1>
          <button 
            onClick={() => router.push('/bookings')}
            className={styles.bookingsButton}
          >
            View My Bookings
          </button>
        </div>

        <div className={styles.section}>
          <h2>Personal Information</h2>
          <div className={styles.info}>
            <div className={styles.field}>
              <label>Username</label>
              <p>{profile.username}</p>
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <p>{profile.email}</p>
            </div>
            <div className={styles.field}>
              <label>Primary Phone</label>
              <p>{profile.phonePrimary}</p>
            </div>
            {profile.phoneSecondary && (
              <div className={styles.field}>
                <label>Secondary Phone</label>
                <p>{profile.phoneSecondary}</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Wallet Balance</h2>
          <div className={styles.walletSection}>
            <div className={styles.balance}>
              <span className={styles.amount}>₹{profile.walletBalance}</span>
              <button 
                onClick={() => setShowAddPayment(true)}
                className={styles.addFundsButton}
              >
                Add Funds
              </button>
            </div>

            {showAddPayment && (
              <div className={styles.addFundsForm}>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                />
                <button 
                  onClick={handleAddFunds}
                  disabled={addingFunds}
                  className={styles.confirmButton}
                >
                  {addingFunds ? 'Adding...' : 'Confirm'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Coach Type Selection</h2>
          <select className={styles.coachTypeSelect}>
            <option value="">Select Coach Type</option>
            <option value="1A">1st AC</option>
            <option value="2A">2nd AC</option>
            <option value="3A">3rd AC</option>
            <option value="SL">Sleeper</option>
            <option value="CC">Chair Car</option>
          </select>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Payment Methods</h2>
            <button 
              onClick={() => setShowAddPayment(true)}
              className={styles.addButton}
            >
              Add New
            </button>
          </div>

          <div className={styles.paymentMethods}>
            {profile.paymentMethods.map((method) => (
              <div key={method.id} className={styles.paymentMethod}>
                <div className={styles.paymentInfo}>
                  {method.type === 'card' ? (
                    <>
                      <span className={styles.cardType}>Credit/Debit Card</span>
                      <span className={styles.cardNumber}>
                        •••• {method.details.cardNumber?.slice(-4)}
                      </span>
                      <span className={styles.cardName}>
                        {method.details.cardHolderName}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={styles.upiType}>UPI ID</span>
                      <span className={styles.upiId}>{method.details.upiId}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePaymentMethod(method.id)}
                  className={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {showAddPayment && (
            <div className={styles.addPaymentForm}>
              <h3>Add Payment Method</h3>
              <div className={styles.paymentTypeSelect}>
                <label>
                  <input
                    type="radio"
                    value="card"
                    checked={newPayment.type === 'card'}
                    onChange={(e) => setNewPayment({ ...newPayment, type: 'card' })}
                  />
                  Credit/Debit Card
                </label>
                <label>
                  <input
                    type="radio"
                    value="upi"
                    checked={newPayment.type === 'upi'}
                    onChange={(e) => setNewPayment({ ...newPayment, type: 'upi' })}
                  />
                  UPI
                </label>
              </div>

              {newPayment.type === 'card' ? (
                <>
                  <div className={styles.inputGroup}>
                    <label>Card Number</label>
                    <input
                      type="text"
                      value={newPayment.cardNumber}
                      onChange={(e) => setNewPayment({ ...newPayment, cardNumber: e.target.value })}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Card Holder Name</label>
                    <input
                      type="text"
                      value={newPayment.cardHolderName}
                      onChange={(e) => setNewPayment({ ...newPayment, cardHolderName: e.target.value })}
                      placeholder="Name on card"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      value={newPayment.cardExpiry}
                      onChange={(e) => setNewPayment({ ...newPayment, cardExpiry: e.target.value })}
                      placeholder="MM/YY"
                    />
                  </div>
                </>
              ) : (
                <div className={styles.inputGroup}>
                  <label>UPI ID</label>
                  <input
                    type="text"
                    value={newPayment.upiId}
                    onChange={(e) => setNewPayment({ ...newPayment, upiId: e.target.value })}
                    placeholder="username@upi"
                  />
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPaymentMethod}
                  className={styles.saveButton}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}