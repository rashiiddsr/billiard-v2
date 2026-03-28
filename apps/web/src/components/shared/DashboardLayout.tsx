'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import { Bell, ChevronDown, LogOut, Menu, User, Settings } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  title?: string;
}

const HOME_MAP: Record<string, string> = {
  OWNER:   '/owner/dashboard',
  MANAGER: '/manager/dashboard',
  CASHIER: '/cashier/dashboard',
  MEMBER:  '/owner/dashboard',
};

const roleLabels: Record<string, string> = {
  OWNER:   'Owner',
  MANAGER: 'Manager',
  CASHIER: 'Kasir',
  MEMBER:  'Member',
};

const roleBadgeStyle: Record<string, React.CSSProperties> = {
  OWNER:   { background: 'rgba(201,168,76,0.12)', color: '#9A6F10' },
  MANAGER: { background: 'rgba(37,99,235,0.1)',   color: '#1d4ed8' },
  CASHIER: { background: 'rgba(5,150,105,0.1)',   color: '#047857' },
  MEMBER:  { background: 'rgba(139,92,246,0.1)',  color: '#7c3aed' },
};

export default function DashboardLayout({ children, allowedRoles }: Props) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(HOME_MAP[user.role] || '/login');
    }
  }, [user, loading, allowedRoles, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') setIsSidebarOpen(window.innerWidth > 768);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 32 }}>🎱</div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(201,168,76,0.2)', borderTopColor: 'var(--color-gold)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const badgeStyle = roleBadgeStyle[user.role] || roleBadgeStyle.MEMBER;

  return (
    <div className={`layout-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <Sidebar />

      <div className="layout-main">
        <header className="layout-topbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setIsSidebarOpen((p) => !p)}
            aria-label="Toggle sidebar"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Menu size={19} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.role !== 'MEMBER' && (
              <button
                className="btn btn-ghost btn-icon"
                title="Notifikasi"
                style={{ position: 'relative', color: 'var(--color-text-muted)' }}
              >
                <Bell size={17} />
                <span style={{ position: 'absolute', top: 7, right: 7, width: 6, height: 6, background: 'var(--color-danger)', borderRadius: '50%', border: '1.5px solid var(--color-bg)' }} />
              </button>
            )}

            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                className="profile-pill"
                onClick={() => setIsProfileOpen((p) => !p)}
                aria-label="Profile menu"
              >
                <div className="profile-pill-avatar">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : initials}
                </div>
                <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                  <div className="profile-pill-name">{user.name}</div>
                  <div className="profile-pill-role">{roleLabels[user.role] || user.role}</div>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown" style={{ animation: 'dropIn 0.15s ease both' }}>
                  <div className="profile-dropdown-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', fontWeight: 700, fontSize: 13 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{user.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, ...badgeStyle }}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{user.email || ''}</div>
                  </div>
                  <button className="profile-dropdown-item" onClick={() => { router.push(`/${user.role.toLowerCase()}/profile`); setIsProfileOpen(false); }}>
                    <User size={14} /> Profil Saya
                  </button>
                  <button className="profile-dropdown-item danger" onClick={logout}>
                    <LogOut size={14} /> Keluar
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

      <style>{`
        @keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
