'use client';
import { useState, useEffect } from 'react';
import { stockApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { asArray } from '@/lib/utils';

export default function StockPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string|null>(null);
  const [delta, setDelta] = useState(''); const [notes, setNotes] = useState(''); const [actionType, setActionType] = useState('RESTOCK');

  const load = async () => { setLoading(true); try { setStocks(asArray(await stockApi.getFnbStock())); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleAdjust = async (menuItemId: string) => {
    if (!delta || Number(delta) === 0) { toast.error('Masukkan jumlah'); return; }
    try {
      await stockApi.adjustStock(menuItemId, { actionType, quantityDelta: Number(delta), notes });
      toast.success('Stok diperbarui'); setEditId(null); setDelta(''); setNotes(''); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
  };

  const alerts = stocks.filter(s => s.qtyOnHand <= s.lowStockThreshold && s.trackStock);

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Stok F&B</h1><p className="page-subtitle">{stocks.length} item</p></div></div>
      {alerts.length > 0 && (
        <div className="alert alert-warning mb-4"><AlertTriangle size={16} /><span><strong>{alerts.length} item</strong> stok rendah: {alerts.map(a => a.menuItem?.name).join(', ')}</span></div>
      )}
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Menu</th><th>Stok</th><th>Min. Stok</th><th>Track</th><th>Aksi</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
          : stocks.map(s => (
            <>
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.menuItem?.name}</td>
                <td><span style={{ fontWeight: 700, color: s.qtyOnHand <= s.lowStockThreshold ? 'var(--color-danger)' : undefined }}>{s.qtyOnHand}</span></td>
                <td>{s.lowStockThreshold}</td>
                <td><span className={`badge ${s.trackStock ? 'badge-success' : 'badge-neutral'}`}>{s.trackStock ? 'Ya' : 'Tidak'}</span></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setEditId(editId === s.menuItemId ? null : s.menuItemId)}>Sesuaikan</button></td>
              </tr>
              {editId === s.menuItemId && (
                <tr>
                  <td colSpan={5} style={{ background: 'var(--color-gold-pale)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select className="form-select" value={actionType} onChange={e => setActionType(e.target.value)} style={{ width: 'auto' }}>
                        <option value="RESTOCK">Restock</option><option value="MANUAL_ADJUSTMENT">Koreksi Manual</option>
                      </select>
                      <input type="number" className="form-input" placeholder="Jumlah" value={delta} onChange={e => setDelta(e.target.value)} style={{ width: 100 }} />
                      <input className="form-input" placeholder="Catatan (opsional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAdjust(s.menuItemId)}>Simpan</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Batal</button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table></div></div>
    </div>
  );
}
