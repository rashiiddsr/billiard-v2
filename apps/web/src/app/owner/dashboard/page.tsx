'use client';

import { useState, useEffect } from 'react';
import { api, financeApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Clock, Users, CreditCard, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';

export default function OwnerDashboard() {
  const [report, setReport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      financeApi.getDailyReport(today),
      api.get('/billing/sessions/active'),
    ]).then(([r, s]) => { setReport(r); setSessions(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Pendapatan Hari Ini', value: formatRupiah(report?.totalRevenue || 0), icon: TrendingUp, iconClass: 'stat-card-icon--green' },
    { label: 'Sesi Aktif', value: sessions.length, icon: Clock, iconClass: 'stat-card-icon--gold' },
    { label: 'Transaksi', value: report?.totalTransactions || 0, icon: CreditCard, iconClass: 'stat-card-icon--blue' },
    { label: 'Pendapatan F&B', value: formatRupiah(report?.fnbRevenue || 0), icon: ShoppingBag, iconClass: 'stat-card-icon--orange' },
  ];

  const chartData = report?.hourlyBreakdown || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Owner</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href="/owner/finance" className="btn btn-primary btn-sm"><ArrowUpRight size={14} /> Lihat Laporan</Link>
      </div>

      <div className="grid-4 mb-6">
        {stats.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="stat-card">
            <div className={`stat-card-icon ${iconClass}`}><Icon size={20} /></div>
            <div className="stat-card-value" style={{ fontSize: typeof value === 'string' && value.length > 10 ? 16 : undefined }}>{loading ? '...' : value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Chart */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title">Pendapatan per Jam</h3></div>
          <div className="card-body" style={{ paddingTop: 0, height: 220 }}>
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>Belum ada data hari ini</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formatRupiah(v), 'Pendapatan']} labelFormatter={l => `Pukul ${l}:00`} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sesi aktif */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Sesi Aktif</h3>
            <Link href="/owner/billing" className="btn btn-ghost btn-sm">Lihat semua</Link>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>Tidak ada sesi aktif</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.slice(0, 5).map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'var(--color-primary)', flexShrink: 0 }}>
                      {s.table?.name?.replace(/\D/g, '')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.table?.name} — {s.member?.name || s.guestName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.rateType}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-primary)' }}>
                      {formatRupiah(s.rateType === 'FLEXIBLE' ? Number(s.temporaryAmount || 0) : Number(s.totalAmount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
