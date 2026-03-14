'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const HOME_MAP: Record<string, string> = {
  OWNER:     '/owner/dashboard',
  DEVELOPER: '/developer/dashboard',
  MANAGER:   '/manager/dashboard',
  CASHIER:   '/cashier/dashboard',
  MEMBER:    '/member/dashboard',
};

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(HOME_MAP[user.role] || '/login');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎱</div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid var(--color-gold-light)',
          borderTopColor: 'var(--color-gold)',
          margin: '0 auto',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
