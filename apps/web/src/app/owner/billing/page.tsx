'use client';
import { useState, useEffect } from 'react';
import { api, billingApi } from '@/lib/api';
import { formatRupiah, formatDuration } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RefreshCw, Square } from 'lucide-react';

export default function OwnerBillingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const r = await api.get('/billing/sessions/active'); setSessions(r.data); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

  const elapsed = (s: any) => { const m = s.elapsedMinutes ?? Math.ceil((Date.now() - new Date(s.startTime).getTime()) / 60000); return formatDuration(m); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Billing Aktif</h1><p className="page-subtitle">{sessions.length} sesi berjalan</p></div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      {sessions.length === 0 ? (
        <div className="card card-padded empty-state"><div className="empty-state-icon"><Square size={24} /></div><div>Tidak ada sesi aktif</div></div>
      ) : (
        <div className="card"><div className="table-wrapper"><table className="data-table">
          <thead><tr><th>Meja</th><th>Tamu / Member</th><th>Tipe</th><th>Mulai</th><th>Durasi</th><th>Total</th></tr></thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.table?.name}</td>
                <td>{s.member ? <>{s.member.name} <span className="badge badge-gold" style={{ fontSize: 9 }}>{s.member.memberNumber}</span></> : (s.guestName || '—')}</td>
                <td><span className="badge badge-neutral">{s.rateType}</span></td>
                <td style={{ fontSize: 12 }}>{new Date(s.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{elapsed(s)}</td>
                <td style={{ fontWeight: 700 }}>{formatRupiah(s.rateType === 'FLEXIBLE' ? Number(s.temporaryAmount || 0) : Number(s.totalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </div>
  );
}
