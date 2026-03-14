'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, Clock, CreditCard, Package, ListOrdered, RefreshCw } from 'lucide-react';
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
  const [tables, setTables] = useState<Table[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
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
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

  const available = tables.filter(t => t.status === 'AVAILABLE' && (t as any).isActive).length;
  const occupied  = tables.filter(t => t.status === 'OCCUPIED').length;
  const totalRevenue = sessions.reduce((s, sess) => s + Number(sess.rateType === 'FLEXIBLE' ? (sess.temporaryAmount || sess.totalAmount) : sess.totalAmount), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Kasir</h1>
          <p className="page-subtitle">Selamat datang, {user?.name}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>

      <div className="grid-4 mb-6">
        <div className="stat-card">
          <div className="stat-card-icon"><LayoutDashboard size={20} /></div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{available}</div>
          <div className="stat-card-label">Meja Tersedia</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Clock size={20} /></div>
          <div className="stat-card-value" style={{ color: 'var(--color-gold)' }}>{occupied}</div>
          <div className="stat-card-label">Meja Terisi</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CreditCard size={20} /></div>
          <div className="stat-card-value" style={{ fontSize: 18 }}>{formatRupiah(totalRevenue)}</div>
          <div className="stat-card-label">Pendapatan Aktif</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><ListOrdered size={20} /></div>
          <div className="stat-card-value" style={{ color: waiting > 0 ? 'var(--color-warning)' : undefined }}>{waiting}</div>
          <div className="stat-card-label">Antrian</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Sesi aktif */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}>
            <h3 className="card-title">Sesi Aktif ({sessions.length})</h3>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>Tidak ada sesi aktif</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.slice(0, 6).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--color-primary)', flexShrink: 0 }}>
                      {s.table.name.replace(/\D/g, '')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.table.name} — {s.member?.name || s.guestName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {s.elapsedMinutes ? formatDuration(s.elapsedMinutes) : '—'}
                        {s.member && <span className="badge badge-gold" style={{ marginLeft: 6, fontSize: 9 }}>M</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
                      {formatRupiah(s.rateType === 'FLEXIBLE' ? Number(s.temporaryAmount || 0) : Number(s.totalAmount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/cashier/billing" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
              Kelola Billing
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="card card-padded">
          <h3 className="card-title mb-4">Aksi Cepat</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { href: '/cashier/billing', icon: Clock, label: 'Kelola Meja & Billing', desc: 'Mulai, stop, extend sesi' },
              { href: '/cashier/orders', icon: Package, label: 'Order F&B', desc: 'Tambah pesanan makanan & minuman' },
              { href: '/cashier/checkout', icon: CreditCard, label: 'Checkout Pembayaran', desc: 'Proses pembayaran' },
              { href: '/cashier/waiting-list', icon: ListOrdered, label: `Waiting List (${waiting})`, desc: 'Kelola antrian tamu' },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-md)', textDecoration: 'none', border: '1px solid var(--color-gold-light)', transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
