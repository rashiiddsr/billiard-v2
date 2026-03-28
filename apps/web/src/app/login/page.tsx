'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

const HOME_MAP: Record<string, string> = {
  OWNER:   '/owner/dashboard',
  MANAGER: '/manager/dashboard',
  CASHIER: '/cashier/dashboard',
  MEMBER:  '/owner/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!authLoading && user) router.replace(HOME_MAP[user.role] || '/');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email dan password wajib diisi'); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim(), password);
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
        <Loader2 size={28} style={{ color: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Decorative orbs */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)', top: -100, left: -100, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(190,24,93,0.12) 0%, transparent 70%)', bottom: -80, right: -60, pointerEvents: 'none' }} />

      <div className="login-card" style={{ animation: 'slideUp 0.3s ease both' }}>
        {/* Brand */}
        <div className="login-brand">
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: '0 8px 24px rgba(44,20,0,0.3)',
          }}>🎱</div>
          <div className="login-brand-name">Billiard POS</div>
          <div className="login-brand-sub">Management System</div>
          <div className="login-divider" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email" type="email" className="form-input"
              placeholder="nama@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" autoFocus disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password" type={showPw ? 'text' : 'password'} className="form-input"
                placeholder="Masukkan password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', padding: 4, display: 'flex' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', marginTop: 4, borderRadius: 'var(--radius-lg)', gap: 10 }}
          >
            {loading ? (
              <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Masuk...</>
            ) : (
              <>Masuk <ArrowRight size={17} /></>
            )}
          </button>
        </form>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
