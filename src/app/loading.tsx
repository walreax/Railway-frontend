'use client';
import React from 'react';
import styles from './page.module.css';

export default function Loading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading...</p>
    </div>
  );
}