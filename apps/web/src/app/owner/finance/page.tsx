'use client';
import { useState, useEffect } from 'react';
import { financeApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatRupiah } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function OwnerFinancePage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const load = async (p: 'week' | 'month') => {
    setLoading(true);
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const start = new Date(now);
    if (p === 'week') start.setDate(start.getDate() - 6);
    else start.setDate(1);
    try {
      const res = await financeApi.getReport(start.toISOString().split('T')[0], end);
      setReport(res);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(period); }, [period]);

  const net = (report?.totalRevenue || 0) - (report?.totalExpenses || 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Laporan Keuangan</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${period === 'week' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('week')}>7 Hari</button>
          <button className={`btn btn-sm ${period === 'month' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('month')}>Bulan Ini</button>
        </div>
      </div>

      <div className="grid-3 mb-6">
        {[
          { label: 'Total Pendapatan', value: formatRupiah(report?.totalRevenue || 0), icon: TrendingUp, color: 'var(--color-success)' },
          { label: 'Total Pengeluaran', value: formatRupiah(report?.totalExpenses || 0), icon: TrendingDown, color: 'var(--color-danger)' },
          { label: 'Laba Bersih', value: formatRupiah(net), icon: DollarSign, color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon"><Icon size={20} style={{ color }} /></div>
            <div className="stat-card-value" style={{ fontSize: 17, color }}>{loading ? '...' : value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title">Pendapatan Harian</h3></div>
          <div className="card-body" style={{ paddingTop: 0, height: 240 }}>
            {!report?.dailyBreakdown?.length ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.dailyBreakdown} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" tickFormatter={d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formatRupiah(v), 'Pendapatan']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="var(--color-gold)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card card-padded">
          <h3 className="card-title mb-4">Ringkasan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Pendapatan Billing', formatRupiah(report?.billingRevenue || 0)],
              ['Pendapatan F&B', formatRupiah(report?.fnbRevenue || 0)],
              ['Total Transaksi', report?.totalTransactions || 0],
              ['Sesi Selesai', report?.completedSessions || 0],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{loading ? '...' : value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
