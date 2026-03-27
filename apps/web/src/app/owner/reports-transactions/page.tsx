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
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, PiggyBank, Receipt, Timer, TrendingUp, WalletCards } from 'lucide-react';

type Period = '7d' | '30d';
const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f43f5e'];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function OwnerReportsTransactionsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [trx, exp] = await Promise.all([
        paymentsApi.list({ page: 1, limit: 2000, status: 'PAID' }),
        financeApi.listExpenses({ page: 1, limit: 2000 }),
      ]);
      setPayments(Array.isArray(trx?.data) ? trx.data : []);
      setExpenses(Array.isArray(exp?.data) ? exp.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const days = period === '7d' ? 7 : 30;
    const now = new Date();
    const from = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    const trx = payments.filter((p) => {
      const paidAt = p?.paidAt ? new Date(p.paidAt) : null;
      return paidAt && paidAt >= from;
    });

    const exp = expenses.filter((e) => {
      const date = e?.date ? new Date(e.date) : null;
      return date && date >= from;
    });

    return { from, trx, exp };
  }, [payments, expenses, period]);

  const kpi = useMemo(() => {
    const totalRevenue = filtered.trx.reduce((n, p) => n + Number(p.totalAmount || 0), 0);
    const totalExpenses = filtered.exp.reduce((n, e) => n + Number(e.amount || 0), 0);
    const totalBilling = filtered.trx.reduce((n, p) => n + Number(p.billingAmount || 0), 0);
    const totalFnb = filtered.trx.reduce((n, p) => n + Number(p.fnbAmount || 0), 0);
    const totalDiscount = filtered.trx.reduce((n, p) => n + Number(p.discountAmount || 0), 0);
    const totalDurationMinutes = filtered.trx.reduce((n, p) => n + Number(p.billingSession?.durationMinutes || 0), 0);
    const avgPerDay = totalRevenue / (period === '7d' ? 7 : 30);

    return {
      totalRevenue,
      totalExpenses,
      net: totalRevenue - totalExpenses,
      trxCount: filtered.trx.length,
      avgPerDay,
      totalBilling,
      totalFnb,
      totalDiscount,
      totalDurationMinutes,
    };
  }, [filtered, period]);

  const charts = useMemo(() => {
    const byDateMap: Record<string, { date: string; revenue: number; trx: number; expense: number }> = {};

    for (const p of filtered.trx) {
      const key = new Date(p.paidAt).toISOString().slice(0, 10);
      if (!byDateMap[key]) byDateMap[key] = { date: key, revenue: 0, trx: 0, expense: 0 };
      byDateMap[key].revenue += Number(p.totalAmount || 0);
      byDateMap[key].trx += 1;
    }

    for (const e of filtered.exp) {
      const key = new Date(e.date).toISOString().slice(0, 10);
      if (!byDateMap[key]) byDateMap[key] = { date: key, revenue: 0, trx: 0, expense: 0 };
      byDateMap[key].expense += Number(e.amount || 0);
    }

    const daily = Object.values(byDateMap).sort((a, b) => a.date.localeCompare(b.date));

    const methodsMap: Record<string, number> = {};
    const tablePerformanceMap: Record<string, { name: string; total: number; durationMinutes: number; sessions: number }> = {};
    for (const p of filtered.trx) {
      methodsMap[p.method || 'LAINNYA'] = (methodsMap[p.method || 'LAINNYA'] || 0) + Number(p.totalAmount || 0);

      const tableId = p?.billingSession?.table?.id || p?.billingSession?.tableId;
      if (tableId) {
        const tableName = p?.billingSession?.table?.name || 'Tanpa Nama Meja';
        const revenue = Number(p.billingAmount || 0);
        const durationMinutes = Number(p?.billingSession?.durationMinutes || 0);
        if (!tablePerformanceMap[tableId]) {
          tablePerformanceMap[tableId] = { name: tableName, total: 0, durationMinutes: 0, sessions: 0 };
        }
        tablePerformanceMap[tableId].total += revenue;
        tablePerformanceMap[tableId].durationMinutes += durationMinutes;
        tablePerformanceMap[tableId].sessions += 1;
      }
    }

    const methods = Object.entries(methodsMap).map(([method, total]) => ({ method, total }));
    const topTables = Object.values(tablePerformanceMap)
      .sort((a, b) => (b.total - a.total) || (b.durationMinutes - a.durationMinutes))
      .slice(0, 5);

    return {
      daily,
      methods,
      topTables,
      splitRevenue: [
        { name: 'Billing', value: kpi.totalBilling },
        { name: 'F&B', value: kpi.totalFnb },
      ],
    };
  }, [filtered, kpi.totalBilling, kpi.totalFnb]);

  const cards = [
    { label: 'Omset', value: formatRupiah(kpi.totalRevenue), icon: ArrowUpCircle, color: 'var(--color-success)' },
    { label: 'Pengeluaran', value: formatRupiah(kpi.totalExpenses), icon: ArrowDownCircle, color: 'var(--color-danger)' },
    { label: 'Laba Bersih', value: formatRupiah(kpi.net), icon: PiggyBank, color: kpi.net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
    { label: 'Total Transaksi', value: String(kpi.trxCount), icon: Receipt, color: 'var(--color-primary)' },
    { label: 'Pendapatan Billing', value: formatRupiah(kpi.totalBilling), icon: WalletCards, color: 'var(--color-gold)' },
    { label: 'Rata-rata Omset/Hari', value: formatRupiah(kpi.avgPerDay), icon: TrendingUp, color: 'var(--color-info)' },
    { label: 'Total Diskon', value: formatRupiah(kpi.totalDiscount), icon: CreditCard, color: 'var(--color-warning)' },
    { label: 'Total Jam Main', value: `${Math.round(kpi.totalDurationMinutes / 60)} jam`, icon: Timer, color: 'var(--color-text)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Transaksi</h1>
          <p className="page-subtitle">Dashboard modern untuk omset, performa kasir, transaksi harian, dan pengeluaran.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${period === '7d' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('7d')}>7 Hari</button>
          <button className={`btn btn-sm ${period === '30d' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPeriod('30d')}>30 Hari</button>
        </div>
      </div>

      <div className="grid-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card" style={{ borderTop: '2px solid rgba(245,158,11,.5)' }}>
            <div className="stat-card-icon"><Icon size={18} style={{ color }} /></div>
            <div className="stat-card-value">{loading ? '...' : value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Tren Omset Harian</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.daily}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => formatRupiah(v)} />
                <Area dataKey="revenue" stroke="#f59e0b" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Volume Transaksi Harian</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.daily}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="trx" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Komposisi Metode Bayar</h3></div>
          <div className="card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.methods} dataKey="total" nameKey="method" outerRadius={90} label={(x) => x.method}>
                  {charts.methods.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: any) => formatRupiah(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Komposisi Pendapatan Billing vs F&B</h3></div>
          <div className="card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.splitRevenue} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                  {charts.splitRevenue.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatRupiah(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header"><h3 className="card-title">Top Meja Berdasarkan Omset Billing</h3></div>
        <div className="card-body" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.topTables}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value: any, _name, payload: any) => {
                  if (payload?.dataKey === 'durationMinutes') return `${Math.round(Number(value) / 60)} jam`;
                  return formatRupiah(value);
                }}
              />
              <Bar dataKey="total" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="durationMinutes" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Daftar Transaksi Terbaru</h3></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>No Transaksi</th><th>Kasir</th><th>Metode</th><th>Total</th><th>Waktu</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Memuat...</td></tr>
                : filtered.trx.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Belum ada transaksi pada periode ini.</td></tr>
                : filtered.trx.slice(0, 12).map((p) => (
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
    </div>
  );
}
