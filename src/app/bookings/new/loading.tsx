import React from 'react';
import styles from './page.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.bookingCard}>
        <h1>Book Train Tickets</h1>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>Loading booking form...</p>
        </div>
      </div>
    </div>
  );
}