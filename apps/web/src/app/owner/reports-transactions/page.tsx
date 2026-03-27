'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeApi, paymentsApi } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, Receipt, WalletCards } from 'lucide-react';

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];

type Period = '7d' | '30d';

export default function OwnerReportsTransactionsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const endDate = now.toISOString().split('T')[0];
      const start = new Date(now);
      start.setDate(start.getDate() - (period === '7d' ? 6 : 29));
      const startDate = start.toISOString().split('T')[0];

      const [finance, trx] = await Promise.all([
        financeApi.getReport(startDate, endDate),
        paymentsApi.list({ page: 1, limit: 100, status: 'PAID' }),
      ]);

      setReport(finance);
      setPayments(Array.isArray(trx?.data) ? trx.data : []);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = Number(report?.revenue?.total || 0);
  const totalExpenses = Number(report?.expenses?.total || 0);
  const netProfit = Number(report?.netProfit || totalRevenue - totalExpenses);

  const dailyRevenueChart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      if (!p?.paidAt || p?.status !== 'PAID') continue;
      const key = new Date(p.paidAt).toISOString().split('T')[0];
      map[key] = (map[key] || 0) + Number(p.totalAmount || 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));
  }, [payments]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Transaksi</h1>
          <p className="page-subtitle">Ringkasan pendapatan, pengeluaran, metode pembayaran, dan daftar transaksi.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${period === '7d' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('7d')}>7 Hari</button>
          <button className={`btn btn-sm ${period === '30d' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('30d')}>30 Hari</button>
        </div>
      </div>

      <div className="grid-4 mb-6">
        <div className="stat-card"><div className="stat-card-icon"><ArrowUpCircle size={18} /></div><div className="stat-card-value">{loading ? '...' : formatRupiah(totalRevenue)}</div><div className="stat-card-label">Pendapatan</div></div>
        <div className="stat-card"><div className="stat-card-icon"><ArrowDownCircle size={18} /></div><div className="stat-card-value">{loading ? '...' : formatRupiah(totalExpenses)}</div><div className="stat-card-label">Pengeluaran</div></div>
        <div className="stat-card"><div className="stat-card-icon"><WalletCards size={18} /></div><div className="stat-card-value" style={{ color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{loading ? '...' : formatRupiah(netProfit)}</div><div className="stat-card-label">Laba Bersih</div></div>
        <div className="stat-card"><div className="stat-card-icon"><Receipt size={18} /></div><div className="stat-card-value">{loading ? '...' : report?.paymentMethods?.reduce((n: number, p: any) => n + Number(p.count || 0), 0) || 0}</div><div className="stat-card-label">Total Transaksi</div></div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Grafik Pendapatan Harian</h3></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenueChart}>
                <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => [formatRupiah(v), 'Pendapatan']} />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Komposisi Metode Bayar</h3></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report?.paymentMethods || []} dataKey="total" nameKey="method" outerRadius={88}>
                  {(report?.paymentMethods || []).map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatRupiah(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Daftar Transaksi Terbaru</h3></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>No Transaksi</th><th>Kasir</th><th>Metode</th><th>Total</th><th>Waktu</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Memuat...</td></tr>
                : payments.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Belum ada transaksi.</td></tr>
                : payments.slice(0, 12).map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace' }}>{p.paymentNumber}</td>
                    <td>{p.paidBy?.name || '-'}</td>
                    <td><span className="badge badge-neutral">{p.method}</span></td>
                    <td>{formatRupiah(p.totalAmount)}</td>
                    <td>{formatDateTime(p.paidAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3 className="card-title">Top Meja Berdasarkan Pendapatan</h3></div>
        <div className="card-body" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report?.perTable || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="tableName" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => formatRupiah(v)} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
