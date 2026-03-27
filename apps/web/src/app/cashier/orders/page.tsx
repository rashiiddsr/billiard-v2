'use client';
import { useState, useEffect, useCallback } from 'react';
import { ordersApi, api, menuApi, paymentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Check, Search, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

export default function CashierOrdersPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [selSession, setSelSession] = useState('');
  const [cart, setCart] = useState<{ menuItemId: string; name: string; price: number; qty: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [standaloneOrderId, setStandaloneOrderId] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [orderNotes, setOrderNotes] = useState('');

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
    const stock = item.stock;
    setCart((c) => {
      const ex = c.find((i) => i.menuItemId === item.id);
      const nextQty = ex ? ex.qty + 1 : 1;
      if (stock?.trackStock && nextQty > Number(stock.qtyOnHand || 0)) {
        toast.error(`Stok ${item.name} tidak cukup`);
        return c;
      }
      return ex
        ? c.map((i) => (i.menuItemId === item.id ? { ...i, qty: nextQty } : i))
        : [...c, { menuItemId: item.id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(c => c.filter(i => i.menuItemId !== id));
  const total = cart.reduce((s,i) => s+i.price*i.qty, 0);
  const standaloneChange = Math.max(0, Number(payAmount || 0) - total);
  const categories = ['Semua', ...Array.from(new Set(menu.map((m) => String(m.category?.name || m.category || 'Lainnya'))))];
  const filteredMenu = menu.filter((m) => {
    const menuCategory = String(m.category?.name || m.category || 'Lainnya');
    const keyword = `${m.name} ${m.sku || ''}`.toLowerCase();
    const byCategory = category === 'Semua' || menuCategory === category;
    const bySearch = !search.trim() || keyword.includes(search.trim().toLowerCase());
    return byCategory && bySearch;
  });

  const resetPaymentPopup = useCallback(() => {
    setShowPaymentPopup(false);
    setStandaloneOrderId('');
    setPayMethod('CASH');
    setPayAmount('');
  }, []);

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Tambahkan item ke pesanan'); return; }
    setBusy(true);
    try {
      const session = sessions.find(s => s.id === selSession);
      const order = await ordersApi.create({
        billingSessionId: selSession || undefined,
        tableId: selSession ? session?.tableId : undefined,
        notes: orderNotes.trim() || undefined,
        items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.qty })),
      });

      if (selSession) {
        toast.success('Pesanan meja dibuat');
        setCart([]);
        setOrderNotes('');
      } else {
        setStandaloneOrderId(order.id);
        setShowPaymentPopup(true);
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleStandalonePayment = async () => {
    if (!standaloneOrderId) return;
    if (payMethod === 'CASH' && Number(payAmount) < total) {
      toast.error('Jumlah bayar kurang');
      return;
    }

    setBusy(true);
    try {
      await paymentsApi.createCheckout({
        orderIds: [standaloneOrderId],
        method: payMethod,
        amountPaid: payMethod === 'CASH' ? Number(payAmount) : total,
      });
      toast.success(`Pembayaran berhasil! Kembalian: ${formatRupiah(standaloneChange)}`);
      setCart([]);
      setOrderNotes('');
      resetPaymentPopup();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Pesanan F&B</h1></div></div>
      <div className="grid-2 orders-layout" style={{ alignItems: 'start' }}>
        <div className="card card-padded" style={{ minHeight: 640, display: 'flex', flexDirection: 'column' }}>
          <div className="form-group mb-3" style={{ marginBottom: 12 }}>
            <label className="form-label">Cari Produk</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="form-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau SKU..."
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {filteredMenu.map((m) => {
                const isTrack = Boolean(m.stock?.trackStock);
                const qty = Number(m.stock?.qtyOnHand || 0);
                const threshold = Number(m.stock?.lowStockThreshold || 0);
                const isLow = isTrack && qty <= threshold;
                const isOut = isTrack && qty <= 0;
                return (
                  <button
                    key={m.id}
                    onClick={() => addToCart(m)}
                    disabled={isOut}
                    style={{
                      textAlign: 'left',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 12px 10px',
                      minHeight: 108,
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      opacity: isOut ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{m.sku || 'SKU'}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, lineHeight: 1.25 }}>{m.name}</div>
                    <div style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: 16 }}>{formatRupiah(m.price)}</div>
                    {isTrack && (
                      <div style={{ marginTop: 4, fontSize: 12, color: isLow ? '#d97706' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isLow && <AlertTriangle size={12} />}
                        Sisa {qty}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredMenu.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>Menu tidak ditemukan.</p>
            )}
          </div>
        </div>

        <div>
          <div className="card card-padded" style={{ position: 'sticky', top: 10 }}>
            <h3 className="card-title mb-4">Pesanan</h3>
            <div className="form-group mb-3">
              <label className="form-label">Pilih Sesi Meja (opsional)</label>
              <select className="form-select" value={selSession} onChange={(e) => setSelSession(e.target.value)}>
                <option value="">-- Standalone (langsung bayar) --</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.table?.name} — {s.member?.name||s.guestName||'Tamu'}</option>)}
              </select>
            </div>

            {cart.length===0 ? <p style={{ color:'var(--color-text-muted)',fontSize:13,textAlign:'center',padding:24 }}>Belum ada item</p>
            : <>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {cart.map(i => (
                  <div key={i.menuItemId} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--color-border-soft)' }}>
                    <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13 }}>{i.name}</div><div style={{ fontSize:12,color:'var(--color-text-muted)' }}>{i.qty}x {formatRupiah(i.price)}</div></div>
                    <div style={{ fontWeight:700,fontSize:13 }}>{formatRupiah(i.price*i.qty)}</div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeFromCart(i.menuItemId)} style={{ color:'var(--color-danger)' }}><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div style={{ display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,marginBottom:16 }}>
                <span>Total</span><span>{formatRupiah(total)}</span>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Catatan Order (opsional)</label>
                <textarea
                  className="form-input"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Contoh: kurang pedas, tanpa es, dll."
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 72 }}
                />
              </div>
              <button className="btn btn-success" style={{ width:'100%',justifyContent:'center' }} onClick={handleSubmit} disabled={busy}>
                {busy?'Memproses...':<><Check size={15}/> {selSession ? 'Buat Pesanan Meja' : 'Konfirmasi & Bayar'}</>}
              </button>
            </>}
          </div>
        </div>
      </div>

      {showPaymentPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card card-padded" style={{ width: '100%', maxWidth: 460 }}>
            <h3 className="card-title mb-4">Checkout F&B Standalone</h3>
            <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total Bayar</span>
              <span>{formatRupiah(total)}</span>
            </div>
            <div className="form-group">
              <label className="form-label">Metode Pembayaran</label>
              <div style={{ display:'flex',gap:8 }}>
                {['CASH','QRIS','TRANSFER'].map(m => (
                  <button key={m} className={`btn btn-sm ${payMethod===m?'btn-dark':'btn-outline'}`} style={{ flex:1 }} onClick={() => setPayMethod(m)}>{m}</button>
                ))}
              </div>
            </div>
            {payMethod === 'CASH' && (
              <div className="form-group">
                <label className="form-label">Jumlah Bayar</label>
                <input className="form-input" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                {Number(payAmount) > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
                    {Number(payAmount) >= total ? `Kembalian: ${formatRupiah(standaloneChange)}` : `Kurang: ${formatRupiah(total - Number(payAmount))}`}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={resetPaymentPopup} disabled={busy}>Batal</button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={handleStandalonePayment} disabled={busy}>{busy ? 'Memproses...' : 'Bayar Sekarang'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
