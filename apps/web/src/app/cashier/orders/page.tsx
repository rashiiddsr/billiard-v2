'use client';
import { useState, useEffect, useCallback } from 'react';
import { ordersApi, api, menuApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, X, Check } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

export default function CashierOrdersPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [selSession, setSelSession] = useState('');
  const [cart, setCart] = useState<{ menuItemId: string; name: string; price: number; qty: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/billing/sessions/active'), menuApi.list({ isActive: true })])
      .then(([s, m]) => {
        setSessions(Array.isArray(s?.data) ? s.data : []);
        setMenu(Array.isArray(m?.data) ? m.data : []);
      })
      .catch(() => {
        setSessions([]);
        setMenu([]);
      });
  }, []);

  const addToCart = (item: any) => {
    setCart(c => { const ex = c.find(i => i.menuItemId === item.id); return ex ? c.map(i => i.menuItemId===item.id?{...i,qty:i.qty+1}:i) : [...c,{menuItemId:item.id,name:item.name,price:Number(item.price),qty:1}]; });
  };
  const removeFromCart = (id: string) => setCart(c => c.filter(i => i.menuItemId !== id));
  const total = cart.reduce((s,i) => s+i.price*i.qty, 0);

  const handleSubmit = async () => {
    if (!selSession) { toast.error('Pilih sesi meja'); return; }
    if (cart.length === 0) { toast.error('Tambahkan item ke pesanan'); return; }
    setBusy(true);
    try {
      const session = sessions.find(s => s.id === selSession);
      await ordersApi.create({ billingSessionId: selSession, tableId: session?.tableId, items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.qty, unitPrice: i.price, subtotal: i.price * i.qty, taxAmount: 0 })) });
      toast.success('Pesanan dibuat'); setCart([]);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Order F&B</h1></div></div>
      <div className="grid-2">
        <div>
          <div className="form-group mb-4"><label className="form-label">Pilih Sesi Meja</label>
            <select className="form-select" value={selSession} onChange={e => setSelSession(e.target.value)}>
              <option value="">-- Pilih meja aktif --</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.table?.name} — {s.member?.name||s.guestName||'Tamu'}</option>)}
            </select>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {menu.map(m => (
              <div key={m.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--color-surface)',borderRadius:'var(--radius-md)',border:'1px solid var(--color-border)' }}>
                <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13 }}>{m.name}</div><div style={{ fontSize:12,color:'var(--color-text-muted)' }}>{m.category}</div></div>
                <div style={{ fontWeight:700,fontSize:13 }}>{formatRupiah(m.price)}</div>
                <button className="btn btn-primary btn-sm" onClick={() => addToCart(m)}><Plus size={13} /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card card-padded">
            <h3 className="card-title mb-4">Pesanan</h3>
            {cart.length===0 ? <p style={{ color:'var(--color-text-muted)',fontSize:13,textAlign:'center',padding:24 }}>Belum ada item</p>
            : <>
              {cart.map(i => (
                <div key={i.menuItemId} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--color-border-soft)' }}>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13 }}>{i.name}</div><div style={{ fontSize:12,color:'var(--color-text-muted)' }}>{i.qty}x {formatRupiah(i.price)}</div></div>
                  <div style={{ fontWeight:700,fontSize:13 }}>{formatRupiah(i.price*i.qty)}</div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeFromCart(i.menuItemId)} style={{ color:'var(--color-danger)' }}><X size={13} /></button>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,marginBottom:16 }}>
                <span>Total</span><span>{formatRupiah(total)}</span>
              </div>
              <button className="btn btn-success" style={{ width:'100%',justifyContent:'center' }} onClick={handleSubmit} disabled={busy}>
                {busy?'Memproses...':<><Check size={15}/> Buat Pesanan</>}
              </button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
