'use client';
import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '@/lib/api';
import { asArray, formatRupiah, formatDateTime, formatDuration } from '@/lib/utils';
import { Filter, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Session { id: string; startTime: string; actualEndTime: string | null; durationMinutes: number; totalAmount: string; rateType: string; status: string; guestName?: string; member?: { name: string; memberNumber: string }; table: { name: string }; payments: any[]; createdBy: { name: string }; }
const statusCls: Record<string, string> = { ACTIVE: 'badge-warning', COMPLETED: 'badge-success', CANCELLED: 'badge-neutral' };
const statusLabel: Record<string, string> = { ACTIVE: 'Aktif', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };

interface Props {
  title: string;
  subtitle?: string;
  unpaidOnly?: boolean;
}

export default function SessionsListPage({ title, subtitle, unpaidOnly = false }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate + 'T23:59:59';
      if (unpaidOnly) params.unpaidOnly = true;
      const res = await billingApi.getSessions(params);
      const rows = asArray<Session>(res);
      const normalizedRows = unpaidOnly
        ? rows.filter((session) =>
          ['ACTIVE', 'COMPLETED'].includes(session.status) && (!session.payments || session.payments.length === 0))
        : rows;
      setSessions(normalizedRows);
      setTotal(unpaidOnly ? normalizedRows.length : Number(res?.total || res?.meta?.total || 0));
    } catch {} finally { setLoading(false); }
  }, [page, filterStatus, startDate, endDate, unpaidOnly]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (session: Session) => {
    if (!confirm(`Hapus sesi meja ${session.table.name}?`)) return;
    try {
      await billingApi.deleteSession(session.id);
      toast.success('Sesi billing dihapus');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus sesi');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      <div className="card card-padded mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
        <select className="form-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: 130 }}>
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="COMPLETED">Selesai</option>
          {!unpaidOnly && <option value="CANCELLED">Dibatalkan</option>}
        </select>
        <input type="date" className="form-input" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} style={{ width: 'auto' }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>s/d</span>
        <input type="date" className="form-input" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} style={{ width: 'auto' }} />
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Meja</th><th>Tamu / Member</th><th>Mulai</th><th>Durasi</th><th>Total</th><th>Tipe</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
              : sessions.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>
              : sessions.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.table.name}</td>
                  <td>
                    {s.member ? <span>{s.member.name} <span className="badge badge-gold" style={{ fontSize: 9 }}>{s.member.memberNumber}</span></span> : (s.guestName || '—')}
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDateTime(s.startTime)}</td>
                  <td>{formatDuration(s.durationMinutes)}</td>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(s.totalAmount)}</td>
                  <td><span className="badge badge-neutral" style={{ fontSize: 11 }}>{s.rateType}</span></td>
                  <td><span className={`badge ${statusCls[s.status] || 'badge-neutral'}`}>{statusLabel[s.status] || s.status}</span></td>
                  <td>
                    {['ACTIVE', 'COMPLETED'].includes(s.status) && (!s.payments || s.payments.length === 0) ? (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(s)} title="Hapus sesi">
                        <Trash2 size={13} />
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Math.ceil(total / 20) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--color-border-soft)' }}>
            {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
