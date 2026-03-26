'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import { Bell, ChevronDown, LogOut, Menu, User } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  title?: string;
}

const HOME_MAP: Record<string, string> = {
  OWNER: '/owner/dashboard',
  DEVELOPER: '/developer/dashboard',
  MANAGER: '/manager/dashboard',
  CASHIER: '/cashier/dashboard',
  MEMBER: '/member/dashboard',
};

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  DEVELOPER: 'Developer',
  MANAGER: 'Manager',
  CASHIER: 'Kasir',
  MEMBER: 'Member',
};

export default function DashboardLayout({ children, allowedRoles }: Props) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSidebarOpen(window.innerWidth > 768);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className={`layout-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <Sidebar />

      <div className="layout-main">
        <header className="layout-topbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user.role !== 'MEMBER' && (
              <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }} title="Notifikasi">
                <Bell size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}

            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                className="profile-pill"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label="Profile menu"
              >
                <div className="profile-pill-avatar">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                  <div className="profile-pill-name">{user.name}</div>
                  <div className="profile-pill-role">{roleLabels[user.role] || user.role}</div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--color-primary-light)' }} />
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div style={{ fontWeight: 700 }}>{user.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{roleLabels[user.role] || user.role}</div>
                  </div>
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      router.push(`/${user.role.toLowerCase()}/profile`);
                      setIsProfileOpen(false);
                    }}
                  >
                    <User size={15} />
                    Profil Saya
                  </button>
                  <button className="profile-dropdown-item danger" onClick={logout}>
                    <LogOut size={15} />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
