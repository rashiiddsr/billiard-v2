'use client';
import { useState, useEffect } from 'react';
import { financeApi, api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { TrendingUp, Clock, ShoppingBag, Users } from 'lucide-react';

export default function ManagerDashboard() {
  const [report, setReport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([financeApi.getDailyReport(today), api.get('/billing/sessions/active')])
      .then(([r, s]) => { setReport(r); setSessions(s.data); }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Dashboard Manager</h1></div></div>
      <div className="grid-4 mb-6">
        {[
          { label: 'Pendapatan Hari Ini', value: formatRupiah(report?.totalRevenue||0), icon: TrendingUp },
          { label: 'Sesi Aktif', value: sessions.length, icon: Clock },
          { label: 'Transaksi', value: report?.totalTransactions||0, icon: ShoppingBag },
          { label: 'Pendapatan F&B', value: formatRupiah(report?.fnbRevenue||0), icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon"><Icon size={20} /></div>
            <div className="stat-card-value" style={{ fontSize: typeof value==='string'&&value.length>10?16:undefined }}>{value}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header" style={{ paddingBottom:14 }}><h3 className="card-title">Sesi Aktif ({sessions.length})</h3></div>
        <div className="card-body" style={{ paddingTop:0 }}>
          {sessions.length===0 ? <p style={{ color:'var(--color-text-muted)',fontSize:13,textAlign:'center',padding:24 }}>Tidak ada sesi aktif</p>
          : <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {sessions.map((s:any) => (
              <div key={s.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--color-border-soft)' }}>
                <div style={{ fontWeight:600,flex:1,fontSize:13 }}>{s.table?.name} — {s.member?.name||s.guestName||'—'}</div>
                <span className="badge badge-neutral" style={{ fontSize:11 }}>{s.rateType}</span>
                <span style={{ fontWeight:700,fontSize:12 }}>{formatRupiah(Number(s.totalAmount))}</span>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
}
