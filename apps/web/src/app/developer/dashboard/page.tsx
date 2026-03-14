'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Monitor, Table2, CheckCircle, XCircle } from 'lucide-react';

export default function DeveloperDashboard() {
  const [tables, setTables] = useState<any[]>([]);
  useEffect(() => { api.get('/tables', { params: { includeInactive: true } }).then(r => setTables(r.data)).catch(() => {}); }, []);
  const active = tables.filter(t => t.isActive).length;
  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Dashboard Developer</h1><p className="page-subtitle">Konfigurasi sistem</p></div></div>
      <div className="grid-3 mb-6">
        <div className="stat-card"><div className="stat-card-icon"><Monitor size={20} /></div><div className="stat-card-value">{tables.length}</div><div className="stat-card-label">Total Meja</div></div>
        <div className="stat-card"><div className="stat-card-icon"><CheckCircle size={20} /></div><div className="stat-card-value" style={{color:'var(--color-success)'}}>{active}</div><div className="stat-card-label">Meja Aktif</div></div>
        <div className="stat-card"><div className="stat-card-icon"><XCircle size={20} /></div><div className="stat-card-value" style={{color:'var(--color-danger)'}}>{tables.length - active}</div><div className="stat-card-label">Meja Nonaktif</div></div>
      </div>
      <div className="card card-padded">
        <h3 className="card-title mb-4">Status Meja</h3>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {tables.map(t => (
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid var(--color-border-soft)'}}>
              <div style={{flex:1,fontWeight:600,fontSize:13}}>{t.name}</div>
              <div style={{fontSize:12,color:'var(--color-text-muted)'}}>Rp {Number(t.hourlyRate).toLocaleString('id-ID')}/jam</div>
              <span className={`badge ${t.status==='AVAILABLE'?'badge-success':t.status==='OCCUPIED'?'badge-warning':'badge-neutral'}`}>{t.status}</span>
              <span className={`badge ${t.isActive?'badge-success':'badge-danger'}`}>{t.isActive?'Aktif':'Nonaktif'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
