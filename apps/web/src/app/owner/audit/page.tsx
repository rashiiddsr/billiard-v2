'use client';
import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '@/lib/api';
import { Filter } from 'lucide-react';
import { asArray, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [filterEntity, setFilterEntity] = useState(''); const [filterAction, setFilterAction] = useState('');
  const actions = ['', 'LOGIN', 'LOGOUT', 'FAILED_AUTH', 'START_BILLING', 'STOP_BILLING', 'PAYMENT', 'CREATE', 'UPDATE', 'DELETE'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ page, limit: 50, entity: filterEntity||undefined, action: filterAction||undefined });
      const rows = asArray(res);
      setLogs(rows);
      setTotal(Number(res?.total || res?.meta?.total || rows.length));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memuat audit log');
      setLogs([]);
      setTotal(0);
    } finally { setLoading(false); }
  }, [page, filterEntity, filterAction]);
  useEffect(()=>{ load(); },[load]);

  const actionColor: Record<string,string> = { LOGIN:'badge-success',LOGOUT:'badge-neutral',FAILED_AUTH:'badge-danger',START_BILLING:'badge-info',STOP_BILLING:'badge-warning',PAYMENT:'badge-gold',CREATE:'badge-success',UPDATE:'badge-neutral',DELETE:'badge-danger' };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Audit Log</h1><p className="page-subtitle">{total} entri</p></div></div>
      <div className="card card-padded mb-4" style={{ display:'flex',gap:12,flexWrap:'wrap',alignItems:'center' }}>
        <Filter size={14} style={{ color:'var(--color-text-muted)' }}/>
        <input className="form-input" placeholder="Entity (contoh: BillingSession)" value={filterEntity} onChange={e=>{setFilterEntity(e.target.value);setPage(1);}} style={{ width:'auto',minWidth:200 }}/>
        <select className="form-select" value={filterAction} onChange={e=>{setFilterAction(e.target.value);setPage(1);}} style={{ width:'auto',minWidth:220 }}>
          {actions.map((a)=> <option key={a || 'ALL'} value={a}>{a || 'Semua Action'}</option>)}
        </select>
      </div>
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entity</th><th>ID Entity</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} style={{ textAlign:'center',padding:32 }}>Memuat...</td></tr>
          : logs.length === 0 ? <tr><td colSpan={5} style={{ textAlign:'center',padding:32,color:'var(--color-text-muted)' }}>Belum ada audit log untuk filter ini.</td></tr>
          : logs.map((l:any)=>(
            <tr key={l.id}>
              <td style={{ fontSize:11,fontFamily:'monospace' }}>{formatDateTime(l.createdAt)}</td>
              <td style={{ fontSize:12 }}>{l.user?.name||'System'}<div style={{ fontSize:10,color:'var(--color-text-muted)' }}>{l.user?.role}</div></td>
              <td><span className={`badge ${actionColor[l.action]||'badge-neutral'}`} style={{ fontSize:10 }}>{l.action}</span></td>
              <td style={{ fontSize:12 }}>{l.entity}</td>
              <td style={{ fontSize:10,fontFamily:'monospace',color:'var(--color-text-muted)' }}>{l.entityId ? `${String(l.entityId).slice(0, 12)}...` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {Math.ceil(total/50)>1&&<div style={{ display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--color-border-soft)' }}>
        {Array.from({length:Math.ceil(total/50)},(_,i)=>i+1).map(p=><button key={p} className={`btn btn-sm ${p===page?'btn-dark':'btn-ghost'}`} onClick={()=>setPage(p)}>{p}</button>)}
      </div>}
      </div>
    </div>
  );
}
