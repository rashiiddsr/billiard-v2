'use client';
import { useState, useEffect } from 'react';
import { paymentsApi, billingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatRupiah } from '@/lib/utils';
import { CreditCard, Check } from 'lucide-react';

const toNumber = (value: any) => Number(value || 0);
const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

const getCashRecommendations = (total: number) => {
  if (total <= 0) return [];
  const options = new Set<number>([total, roundUp(total, 5000), roundUp(total, 10000)]);
  [50000, 100000, 200000, 500000].forEach((note) => {
    if (note >= total) options.add(note);
  });
  return Array.from(options).sort((a, b) => a - b).slice(0, 5);
};

export default function CashierCheckoutPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selId, setSelId] = useState('');
  const [session, setSession] = useState<any>(null);
  const [method, setMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

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
    if (!id) {
      setSession(null);
      return;
    }
    setLoading(true);
    try {
      setSession(await billingApi.getSession(id));
    } catch {
      setSession(null);
      toast.error('Gagal memuat detail sesi');
    } finally {
      setLoading(false);
    }
  };

  const orderRows = (session?.orders || []).filter((order: any) => order.status !== 'CANCELLED');
  const billingAmount = session ? toNumber(session.temporaryAmount ?? session.totalAmount) : 0;
  const fnbSubtotal = orderRows.reduce((sum: number, order: any) => sum + toNumber(order.subtotal), 0);
  const fnbTax = orderRows.reduce((sum: number, order: any) => sum + toNumber(order.taxAmount), 0);
  const totalAmount = billingAmount + fnbSubtotal + fnbTax;
  const change = Math.max(0, Number(amountPaid) - totalAmount);
  const cashRecommendations = getCashRecommendations(totalAmount);

  const handleCheckout = async () => {
    if (!session) return;
    if (method === 'CASH' && Number(amountPaid) < totalAmount) {
      toast.error('Jumlah bayar kurang');
      return;
    }
    setBusy(true);
    try {
      await paymentsApi.createCheckout({
        billingSessionId: session.id,
        orderIds: orderRows.map((order: any) => order.id),
        method,
        amountPaid: method === 'CASH' ? Number(amountPaid) : totalAmount,
      });
      toast.success(`Pembayaran berhasil! Kembalian: ${formatRupiah(change)}`);
      setSession(null);
      setSelId('');
      setAmountPaid('');
      billingApi.getSessions({ status: 'COMPLETED', limit: 20 })
        .then((r) => {
          const completed = Array.isArray(r?.data) ? r.data : [];
          setSessions(completed.filter((s: any) => s.payments.length === 0));
        })
        .catch(() => {
          setSessions([]);
        });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Checkout Pembayaran</h1></div></div>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="form-group mb-4">
          <label className="form-label">Pilih Sesi yang Selesai</label>
          <select className="form-select" value={selId} onChange={(e) => { setSelId(e.target.value); loadSession(e.target.value); }}>
            <option value="">-- Pilih sesi --</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.table?.name} — {s.member?.name || s.guestName || 'Tamu'} ({formatRupiah(s.totalAmount)})</option>)}
          </select>
        </div>

        {loading && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>Memuat detail...</p>}

        {!loading && !session && (
          <div className="card card-padded" style={{ border: '1px solid var(--color-border)' }}>
            <h3 className="card-title" style={{ marginBottom: 8 }}>Detail Pembayaran</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
              Pilih sesi di atas untuk menampilkan ringkasan billing dan F&amp;B sebelum checkout.
            </p>
          </div>
        )}

        {session && (
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title"><CreditCard size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Detail Pembayaran</h3></div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div style={{ background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{session.table?.name} — {session.member?.name || session.guestName || '—'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Billing ({session.rateType})</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(billingAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>F&amp;B</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(fnbSubtotal)}</span>
                </div>
                {fnbTax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Pajak F&amp;B</span>
                    <span style={{ fontWeight: 700 }}>{formatRupiah(fnbTax)}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17 }}><span>TOTAL</span><span style={{ color: 'var(--color-primary)' }}>{formatRupiah(totalAmount)}</span></div>
              </div>

              {orderRows.length > 0 && (
                <div style={{ marginBottom: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', fontWeight: 700, background: 'var(--color-surface-2)' }}>Ringkasan F&amp;B</div>
                  <div style={{ maxHeight: 170, overflowY: 'auto' }}>
                    {orderRows.map((order: any) => (
                      <div key={order.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-soft)' }}>
                        {(order.items || []).map((item: any) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                            <span>{item.quantity}x {item.menuItem?.name || '-'}</span>
                            <span style={{ fontWeight: 700 }}>{formatRupiah(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['CASH', 'QRIS', 'TRANSFER'].map((m) => (
                    <button key={m} className={`btn btn-sm ${method === m ? 'btn-dark' : 'btn-outline'}`} onClick={() => setMethod(m)} style={{ flex: 1 }}>{m}</button>
                  ))}
                </div>
              </div>

              {method === 'CASH' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Jumlah Bayar (Rp)</label>
                    <input type="number" className="form-input" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" style={{ fontSize: 18, fontWeight: 700 }} />
                  </div>
                  {cashRecommendations.length > 0 && (
                    <div style={{ marginBottom: 12, fontSize: 13 }}>
                      <div style={{ marginBottom: 6, color: 'var(--color-text-muted)' }}>Rekomendasi uang tunai cepat:</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {cashRecommendations.map((nominal) => (
                          <button key={nominal} className="btn btn-outline btn-sm" onClick={() => setAmountPaid(String(nominal))}>
                            {formatRupiah(nominal)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {Number(amountPaid) > 0 && (
                    <div style={{ padding: '12px 14px', background: change >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 15 }}>
                      {change >= 0 ? `Kembalian: ${formatRupiah(change)}` : `Kurang: ${formatRupiah(totalAmount - Number(amountPaid))}`}
                    </div>
                  )}
                </>
              )}

              <button className="btn btn-success" style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 14, fontSize: 15 }} onClick={handleCheckout} disabled={busy}>
                {busy ? 'Memproses...' : <><Check size={16} /> Konfirmasi Pembayaran</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
