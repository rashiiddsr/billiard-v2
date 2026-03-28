'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, Clock, CreditCard, Package, ListOrdered, RefreshCw, TrendingUp, ArrowRight } from 'lucide-react';
import { formatRupiah, formatDuration } from '@/lib/utils';
import Link from 'next/link';

interface ActiveSession {
  id: string; tableId: string; startTime: string; totalAmount: string;
  rateType: string; elapsedMinutes?: number; temporaryAmount?: string;
  guestName?: string; member?: { name: string; memberNumber: string };
  table: { name: string }; status: string;
}
interface Table { id: string; name: string; status: string; hourlyRate: string; }

export default function CashierDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [tables, setTables]     = useState<Table[]>([]);
  const [waiting, setWaiting]   = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true); else setLoading(true);
    try {
      const [sessRes, tableRes, waitRes] = await Promise.all([
        api.get('/billing/sessions/active'),
        api.get('/tables'),
        api.get('/waiting-list'),
      ]);
      setSessions(sessRes.data);
      setTables(tableRes.data);
      setWaiting(waitRes.data.filter((w: any) => w.status === 'WAITING').length);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); const iv = setInterval(() => load(), 30000); return () => clearInterval(iv); }, []);

  const available    = tables.filter(t => t.status === 'AVAILABLE' && (t as any).isActive).length;
  const occupied     = tables.filter(t => t.status === 'OCCUPIED').length;
  const totalRevenue = sessions.reduce((s, sess) => s + Number(sess.rateType === 'FLEXIBLE' ? (sess.temporaryAmount || sess.totalAmount) : sess.totalAmount), 0);

  const stats = [
    { icon: LayoutDashboard, value: available, label: 'Meja Tersedia',  color: 'var(--color-success)', iconClass: 'stat-card-icon--green' },
    { icon: Clock,           value: occupied,  label: 'Meja Terisi',    color: 'var(--color-gold)',    iconClass: 'stat-card-icon--gold' },
    { icon: TrendingUp,      value: formatRupiah(totalRevenue), label: 'Pendapatan Aktif', color: 'var(--color-info)', small: true, iconClass: 'stat-card-icon--blue' },
    { icon: ListOrdered,     value: waiting,   label: 'Antrian',        color: waiting > 0 ? 'var(--color-warning)' : undefined, iconClass: 'stat-card-icon--orange' },
  ];

  const quickLinks = [
    { href: '/cashier/billing',      icon: Clock,        label: 'Kelola Meja & Billing', desc: 'Mulai, stop, extend sesi' },
    { href: '/cashier/orders',       icon: Package,      label: 'Order F&B',             desc: 'Tambah pesanan makanan & minuman' },
    { href: '/cashier/checkout',     icon: CreditCard,   label: 'Checkout Pembayaran',   desc: 'Proses pembayaran' },
    { href: '/cashier/waiting-list', icon: ListOrdered,  label: `Waiting List (${waiting})`, desc: 'Kelola antrian tamu' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(201,168,76,0.2)', borderTopColor: 'var(--color-gold)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang kembali, <strong>{user?.name}</strong> 👋</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => load(true)}
          style={{ gap: 6 }}
          disabled={refreshing}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-6">
        {stats.map(({ icon: Icon, value, label, color, small, iconClass }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-card-icon ${iconClass}`}><Icon size={19} /></div>
            <div className="stat-card-value" style={{ color, fontSize: small ? 18 : undefined }}>{value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Sesi Aktif */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="card-title">Sesi Aktif</h3>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: sessions.length > 0 ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.05)', color: sessions.length > 0 ? '#9A6F10' : 'var(--color-text-muted)' }}>
              {sessions.length} sesi
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {sessions.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <div className="empty-state-icon"><Clock size={22} /></div>
                <p style={{ fontSize: 13 }}>Tidak ada sesi aktif</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sessions.slice(0, 6).map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < Math.min(sessions.length, 6) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--color-gold)', flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>
                      {s.table.name.replace(/\D/g, '')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.table.name} — {s.member?.name || s.guestName || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {s.elapsedMinutes ? formatDuration(s.elapsedMinutes) : '—'}
                        {s.member && <span className="badge badge-gold" style={{ fontSize: 9, padding: '1px 6px' }}>Member</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono', monospace", color: 'var(--color-text)', flexShrink: 0 }}>
                      {formatRupiah(s.rateType === 'FLEXIBLE' ? Number(s.temporaryAmount || 0) : Number(s.totalAmount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/cashier/billing" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 14, gap: 6 }}>
              Kelola Billing <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card card-padded">
          <h3 className="card-title mb-4">Aksi Cepat</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickLinks.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href} href={href}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textDecoration: 'none', border: '1px solid rgba(0,0,0,0.06)', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FDFAF4'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 8px rgba(44,20,0,0.2)' }}>
                  <Icon size={17} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--color-text-light)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
