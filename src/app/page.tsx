'use client';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.landingContainer}>
      <section className={styles.hero}>
        <h1>Welcome to Railway Booking System</h1>
        <p className={styles.subtitle}>Book your train tickets easily and securely</p>
        <div className={styles.ctas}>
          <button
            onClick={() => router.push('/search')}
            className={`${styles.button} ${styles.primary}`}
          >
            Search Trains
          </button>
          <button
            onClick={() => router.push('/login')}
            className={`${styles.button} ${styles.secondary}`}
          >
            Login to Book
          </button>
        </div>
      </section>

      <section className={styles.features}>
        <h2>Why Choose Us?</h2>
        <div className={styles.featureGrid}>
          <div className={styles.feature}>
            <h3>Easy Booking</h3>
            <p>Book your tickets in just a few clicks</p>
          </div>
          <div className={styles.feature}>
            <h3>Secure Payments</h3>
            <p>Multiple secure payment options available</p>
          </div>
          <div className={styles.feature}>
            <h3>Real-time Availability</h3>
            <p>Check seat availability instantly</p>
          </div>
          <div className={styles.feature}>
            <h3>Digital Tickets</h3>
            <p>Get e-tickets directly on your device</p>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Search</h3>
            <p>Enter your journey details</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Select</h3>
            <p>Choose your preferred train and class</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Book</h3>
            <p>Complete your booking securely</p>
          </div>
        </div>
      </section>
    </div>
  );
}
