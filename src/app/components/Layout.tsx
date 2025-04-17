'use client';
import { ReactNode } from 'react';
import Header from './Header';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>&copy; 2025 Railway Booking. All rights reserved.</p>
      </footer>
    </div>
  );
}