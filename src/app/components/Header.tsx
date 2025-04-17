'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Header.module.css';

interface User {
  UserID: string;
  username: string;
  email: string;
  walletBalance?: number;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  const fetchBalance = async (userId: string) => {
    if (isUpdatingBalance) return;
    setIsUpdatingBalance(true);
    try {
      const response = await fetch(`/api/users/balance?userId=${userId}`);
      const data = await response.json();
      if (response.ok && user) {
        setUser({ ...user, walletBalance: data.balance });
        // Update localStorage with new balance
        localStorage.setItem('user', JSON.stringify({ ...user, walletBalance: data.balance }));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser?.UserID) { // Check for UserID instead of userId
          localStorage.removeItem('user');
          setUser(null);
        } else {
          setUser(parsedUser);
          // Fetch initial balance
          fetchBalance(parsedUser.UserID);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        localStorage.removeItem('user');
        setUser(null);
      }
    }
  }, []);

  // Refresh balance every minute if user is logged in
  useEffect(() => {
    if (!user?.UserID) return;
    
    const balanceInterval = setInterval(() => {
      fetchBalance(user.UserID);
    }, 60000); // 1 minute

    return () => clearInterval(balanceInterval);
  }, [user?.UserID]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">
          🚆 Railway Booking
        </Link>
      </div>

      <button 
        className={styles.menuButton}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.menuIcon}></span>
      </button>

      <nav className={`${styles.nav} ${isMenuOpen ? styles.active : ''}`}>
        {user ? (
          <>
            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                <span className={styles.welcomeText}>Welcome back,</span>
                <span className={styles.username}>{user.username}</span>
                {user.walletBalance !== undefined && (
                  <span className={styles.walletBalance}>
                    Balance: ₹{user.walletBalance}
                  </span>
                )}
              </div>
              <div className={styles.userNav}>
                <Link 
                  href="/bookings/new" 
                  className={`${styles.navLink} ${isActive('/bookings/new') ? styles.active : ''}`}
                >
                  Book Tickets
                </Link>
                <Link 
                  href="/profile" 
                  className={`${styles.navLink} ${isActive('/profile') ? styles.active : ''}`}
                >
                  My Profile
                </Link>
                <Link 
                  href="/bookings" 
                  className={`${styles.navLink} ${isActive('/bookings') ? styles.active : ''}`}
                >
                  My Bookings
                </Link>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Logout
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.authButtons}>
            <Link href="/login" className={styles.loginButton}>
              Login
            </Link>
            <Link href="/register" className={styles.registerButton}>
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}