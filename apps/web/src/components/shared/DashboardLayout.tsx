'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import { Bell, Menu } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  title?: string;
}

const HOME_MAP: Record<string, string> = {
  OWNER:     '/owner/dashboard',
  DEVELOPER: '/developer/dashboard',
  MANAGER:   '/manager/dashboard',
  CASHIER:   '/cashier/dashboard',
  MEMBER:    '/member/dashboard',
};

export default function DashboardLayout({ children, allowedRoles, title }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(HOME_MAP[user.role] || '/login');
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎱</div>
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

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return (
    <div className="layout-wrapper">
      <Sidebar />

      <div className="layout-main">
        {/* Topbar */}
        <header className="layout-topbar">
          {/* Mobile menu button (hidden on desktop via CSS) */}
          <button
            className="btn btn-ghost btn-icon"
            style={{ display: 'none' }} // Show on mobile via media query
            id="sidebar-toggle"
          >
            <Menu size={20} />
          </button>

          {/* Page title dari context atau prop */}
          <div style={{ flex: 1 }} />

          {/* Right side actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notification bell — hanya untuk non-member */}
            {user.role !== 'MEMBER' && (
              <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }} title="Notifikasi">
                <Bell size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}

            {/* User pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px 5px 5px',
              background: 'var(--color-gold-pale)',
              borderRadius: 999,
              border: '1px solid var(--color-gold-light)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--color-gold)',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                )}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                {user.memberNumber && (
                  <div style={{ fontSize: 10, color: 'var(--color-gold-hover)', fontFamily: 'monospace' }}>
                    {user.memberNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
