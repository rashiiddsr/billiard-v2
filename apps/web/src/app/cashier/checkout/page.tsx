'use client';
import { useState, useEffect } from 'react';
import { paymentsApi, billingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatRupiah } from '@/lib/utils';
import { CreditCard, Check } from 'lucide-react';

export default function CashierCheckoutPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selId, setSelId] = useState('');
  const [session, setSession] = useState<any>(null);
  const [method, setMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => {
    billingApi.getSessions({ status: 'COMPLETED', limit: 20 })
      .then((r) => {
        const completed = Array.isArray(r?.data) ? r.data : [];
        setSessions(completed.filter((s: any) => s.payments.length === 0));
      })
      .catch(() => {
        setSessions([]);
      });
  }, []);

  const loadSession = async (id: string) => {
    if (!id) { setSession(null); return; }
    setLoading(true);
    try { setSession(await billingApi.getSession(id)); }
    catch {
      setSession(null);
      toast.error('Gagal memuat detail sesi');
    } finally { setLoading(false); }
  };

  const totalAmount = session ? Number(session.totalAmount) : 0;
  const change = Math.max(0, Number(amountPaid) - totalAmount);

  const handleCheckout = async () => {
    if (!session) return;
    if (method === 'CASH' && Number(amountPaid) < totalAmount) { toast.error('Jumlah bayar kurang'); return; }
    setBusy(true);
    try {
      const payment = await paymentsApi.createCheckout({ billingSessionId: session.id, method, billingAmount: totalAmount, fnbAmount: 0, subtotal: totalAmount, totalAmount, amountPaid: method==='CASH'?Number(amountPaid):totalAmount });
      await paymentsApi.confirmPayment(payment.id, method==='CASH'?Number(amountPaid):totalAmount);
      toast.success(`Pembayaran berhasil! Kembalian: ${formatRupiah(change)}`);
      setSession(null); setSelId(''); setAmountPaid('');
      billingApi.getSessions({ status: 'COMPLETED', limit: 20 })
        .then((r) => {
          const completed = Array.isArray(r?.data) ? r.data : [];
          setSessions(completed.filter((s: any) => s.payments.length === 0));
        })
        .catch(() => {
          setSessions([]);
        });
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Checkout Pembayaran</h1></div></div>
      <div style={{ maxWidth: 560 }}>
        <div className="form-group mb-4">
          <label className="form-label">Pilih Sesi yang Selesai</label>
          <select className="form-select" value={selId} onChange={e => { setSelId(e.target.value); loadSession(e.target.value); }}>
            <option value="">-- Pilih sesi --</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.table?.name} — {s.member?.name||s.guestName||'Tamu'} ({formatRupiah(s.totalAmount)})</option>)}
          </select>
        </div>

        {loading && <p style={{ color:'var(--color-text-muted)',textAlign:'center',padding:32 }}>Memuat detail...</p>}

        {session && (
          <div className="card">
            <div className="card-header" style={{ paddingBottom:14 }}><h3 className="card-title"><CreditCard size={16} style={{ display:'inline',verticalAlign:'middle',marginRight:8 }}/>Detail Pembayaran</h3></div>
            <div className="card-body" style={{ paddingTop:0 }}>
              <div style={{ background:'var(--color-gold-pale)',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:16 }}>
                <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>{session.table?.name} — {session.member?.name||session.guestName||'—'}</div>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4 }}><span style={{ color:'var(--color-text-muted)' }}>Billing ({session.rateType})</span><span style={{ fontWeight:700 }}>{formatRupiah(session.totalAmount)}</span></div>
                <div className="divider" style={{ margin:'8px 0' }}/>
                <div style={{ display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:17 }}><span>TOTAL</span><span style={{ color:'var(--color-primary)' }}>{formatRupiah(totalAmount)}</span></div>
              </div>

              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <div style={{ display:'flex',gap:8 }}>
                  {['CASH','QRIS','TRANSFER'].map(m=>(
                    <button key={m} className={`btn btn-sm ${method===m?'btn-dark':'btn-outline'}`} onClick={()=>setMethod(m)} style={{ flex:1 }}>{m}</button>
                  ))}
                </div>
              </div>

              {method==='CASH' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Jumlah Bayar (Rp)</label>
                    <input type="number" className="form-input" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder="0" style={{ fontSize:18,fontWeight:700 }}/>
                  </div>
                  {Number(amountPaid)>0 && (
                    <div style={{ padding:'12px 14px',background:change>=0?'var(--color-success-bg)':'var(--color-danger-bg)',borderRadius:'var(--radius-md)',fontWeight:700,fontSize:15 }}>
                      {change>=0?`Kembalian: ${formatRupiah(change)}`:`Kurang: ${formatRupiah(totalAmount-Number(amountPaid))}`}
                    </div>
                  )}
                </>
              )}

              <button className="btn btn-success" style={{ width:'100%',justifyContent:'center',marginTop:16,padding:14,fontSize:15 }} onClick={handleCheckout} disabled={busy}>
                {busy?'Memproses...':<><Check size={16}/> Konfirmasi Pembayaran</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
