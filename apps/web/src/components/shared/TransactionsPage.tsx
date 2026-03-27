'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentsApi, usersApi } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Eye, X } from 'lucide-react';

interface Props { scope: 'cashier' | 'manager' | 'owner' }

export default function TransactionsPage({ scope }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [paidById, setPaidById] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.list({ page, limit: 20, paidById: scope === 'cashier' ? user?.id : (paidById || undefined) });
      setData(res.data || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, paidById, scope, user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scope !== 'cashier') {
      usersApi.listCashiers().then((rows) => setCashiers(rows || [])).catch(() => setCashiers([]));
    }
  }, [scope]);

  const openDetail = async (id: string) => {
    const res = await paymentsApi.getReceipt(id);
    setDetail(res);
  };

  const paymentBadgeClass = (method: string) => {
    const normalized = String(method || '').toUpperCase();
    if (normalized === 'CASH') return 'badge-gold';
    if (normalized === 'QRIS') return 'badge-success';
    if (normalized === 'TRANSFER') return 'badge-info';
    return 'badge-neutral';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Transaksi</h1>
          <p className="page-subtitle">Data transaksi checkout yang selesai</p>
        </div>
      </div>

      {scope !== 'cashier' && (
        <div className="card card-padded mb-4" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="form-label" style={{ margin: 0 }}>Filter kasir:</label>
          <select className="form-select" style={{ width: 260 }} value={paidById} onChange={(e) => { setPaidById(e.target.value); setPage(1); }}>
            <option value="">Semua kasir</option>
            {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Transaksi</th><th>Jenis</th><th>Total</th><th>Kasir</th><th>Pembayaran</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Memuat...</td></tr>
              : data.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Tidak ada data</td></tr>
              : data.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace' }}>{p.paymentNumber}</td>
                  <td>{p.billingSessionId ? 'Meja + F&B' : 'F&B Standalone'}</td>
                  <td>{formatRupiah(p.totalAmount)}</td>
                  <td>{p.paidBy?.name || '-'}</td>
                  <td><span className={`badge ${paymentBadgeClass(p.method)}`}>{p.method}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Lihat Detail" onClick={() => openDetail(p.id)}>
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 700 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className="card-title">Detail Transaksi</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)} aria-label="Tutup modal detail transaksi">
                <X size={16} />
              </button>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              <div><strong>ID:</strong> {detail.paymentNumber}</div>
              <div><strong>Meja:</strong> {detail.table}</div>
              <div><strong>Kasir:</strong> {detail.cashier}</div>
              <div><strong>Waktu Bayar:</strong> {formatDateTime(detail.paidAt)}</div>
              <div><strong>Durasi Main:</strong> {detail.billingSession?.duration ? `${detail.billingSession.duration} menit` : '-'}</div>
              <div><strong>Metode:</strong> {detail.method}</div>
              <div><strong>Subtotal:</strong> {formatRupiah(detail.subtotal)}</div>
              <div><strong>Pajak:</strong> {formatRupiah(detail.tax)}</div>
              <div><strong>Total:</strong> {formatRupiah(detail.total)}</div>
              <div>
                <strong>Item F&B:</strong>
                <ul>
                  {(detail.fnbItems || []).map((item: any, idx: number) => (
                    <li key={idx}>{item.name} x{item.qty} ({formatRupiah(item.subtotal)})</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
