'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

const HOME_MAP: Record<string, string> = {
  OWNER:     '/owner/dashboard',
  DEVELOPER: '/developer/dashboard',
  MANAGER:   '/manager/dashboard',
  CASHIER:   '/cashier/dashboard',
  MEMBER:    '/member/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Jika sudah login, redirect ke home
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(HOME_MAP[user.role] || '/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      // Redirect ditangani oleh useEffect di atas
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Email atau password salah'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="login-page">
        <Loader2 size={32} style={{ color: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎱</div>
          <div className="login-brand-name">Billiard POS</div>
          <div className="login-brand-sub">Premium Management System</div>
          <div className="login-divider" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-light)', padding: 4,
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="alert alert-danger"
              style={{ fontSize: 13, marginBottom: 16 }}
            >
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Masuk...</>
            ) : (
              <><LogIn size={18} /> Masuk</>
            )}
          </button>
        </form>

        {/* Attendance shortcut */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <a
            href="/attendance"
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📍 Halaman Absensi Karyawan
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
