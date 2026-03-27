'use client';

import { useEffect, useMemo, useState } from 'react';
import { menuApi, packagesApi } from '@/lib/api';
import { asArray, formatRupiah } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Edit2, Plus, Trash2, X } from 'lucide-react';

type PackageItemType = 'BILLING' | 'MENU_ITEM';

interface MenuItem {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
}

interface PackageItemForm {
  type: PackageItemType;
  menuItemId?: string;
  quantity: number;
  unitPrice: number;
}

interface TargetRateOption {
  hourlyRate: string;
  tableNames: string[];
}

interface PackageFormState {
  name: string;
  durationMinutes: string;
  price: string;
  targetHourlyRate: string;
  isActive: boolean;
  items: PackageItemForm[];
}

const defaultForm = (): PackageFormState => ({
  name: '',
  durationMinutes: '60',
  price: '',
  targetHourlyRate: '',
  isActive: true,
  items: [{ type: 'MENU_ITEM', menuItemId: '', quantity: 1, unitPrice: 0 }],
});

export default function PackagesManagementPage() {
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [targetRates, setTargetRates] = useState<TargetRateOption[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageFormState>(defaultForm());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pkgRes, rateRes, menuRes] = await Promise.all([
        packagesApi.list(),
        packagesApi.targetRates(),
        menuApi.list({ isActive: true, limit: 200 }),
      ]);
      setPkgs(asArray(pkgRes));
      setTargetRates(asArray(rateRes));
      setMenuItems(asArray(menuRes?.data));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memuat data paket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const billingUnitPrice = useMemo(() => {
    const hourlyRate = Number(form.targetHourlyRate || 0);
    const duration = Number(form.durationMinutes || 0);
    if (!hourlyRate || !duration) return 0;
    return Math.round((hourlyRate * duration) / 60);
  }, [form.targetHourlyRate, form.durationMinutes]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (pkg: any) => {
    setEditId(pkg.id);
    const menuItemRows = asArray(pkg.items)
      .filter((item: any) => item.type === 'MENU_ITEM')
      .map((item: any) => ({
        type: 'MENU_ITEM' as const,
        menuItemId: item.menuItemId || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
      }));

    setForm({
      name: pkg.name,
      durationMinutes: String(pkg.durationMinutes || 60),
      price: String(pkg.price || ''),
      targetHourlyRate: String(pkg.targetHourlyRate || ''),
      isActive: !!pkg.isActive,
      items: menuItemRows.length > 0 ? menuItemRows : [{ type: 'MENU_ITEM', menuItemId: '', quantity: 1, unitPrice: 0 }],
    });
    setShowModal(true);
  };

  const addMenuItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { type: 'MENU_ITEM', menuItemId: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeMenuItemRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateMenuItemRow = (idx: number, patch: Partial<PackageItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const handleSelectMenu = (idx: number, menuItemId: string) => {
    const selectedMenu = menuItems.find((item) => item.id === menuItemId);
    updateMenuItemRow(idx, {
      menuItemId,
      unitPrice: selectedMenu ? Number(selectedMenu.price || 0) : 0,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nama paket wajib diisi');
    if (!form.targetHourlyRate) return toast.error('Target harga meja wajib dipilih');
    if (!form.durationMinutes || Number(form.durationMinutes) < 1) return toast.error('Durasi wajib diisi');
    if (!form.price || Number(form.price) < 0) return toast.error('Harga paket wajib diisi');

    const cleanedMenuItems = form.items
      .filter((item) => item.menuItemId)
      .map((item) => ({
        type: 'MENU_ITEM',
        menuItemId: item.menuItemId,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
      }));

    const payload = {
      name: form.name.trim(),
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
      targetHourlyRate: Number(form.targetHourlyRate),
      isActive: form.isActive,
      items: [
        {
          type: 'BILLING',
          quantity: 1,
          unitPrice: billingUnitPrice,
        },
        ...cleanedMenuItems,
      ],
    };

    setBusy(true);
    try {
      if (editId) {
        await packagesApi.update(editId, payload);
        toast.success('Paket diperbarui');
      } else {
        await packagesApi.create(payload);
        toast.success('Paket dibuat');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan paket');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    try {
      await packagesApi.remove(id);
      toast.success('Paket dihapus');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus paket');
    }
  };

  const selectedRateMeta = targetRates.find((rate) => String(rate.hourlyRate) === String(form.targetHourlyRate));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paket Billing</h1>
          <p className="page-subtitle">Manager & owner bisa mengatur paket durasi + bundling F&B berdasarkan tarif meja.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Tambah Paket
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Harga Paket</th>
                <th>Durasi</th>
                <th>Target Tarif</th>
                <th>Bundling</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
              ) : pkgs.length === 0 ? (
                <tr><td colSpan={7} className="table-empty-cell">Belum ada data untuk ditampilkan</td></tr>
              ) : (
                pkgs.map((pkg) => {
                  const bundleItems = asArray(pkg.items).filter((item: any) => item.type === 'MENU_ITEM');
                  return (
                    <tr key={pkg.id}>
                      <td style={{ fontWeight: 600 }}>{pkg.name}</td>
                      <td style={{ fontWeight: 700 }}>{formatRupiah(pkg.price)}</td>
                      <td>{pkg.durationMinutes ? `${pkg.durationMinutes} menit` : '-'}</td>
                      <td>{formatRupiah(pkg.targetHourlyRate)}/jam</td>
                      <td style={{ minWidth: 220 }}>
                        {bundleItems.length === 0 ? 'Tanpa F&B' : bundleItems.map((item: any) => (
                          <div key={item.id} style={{ fontSize: 12 }}>
                            • {item.menuItem?.name || 'Menu'} x{item.quantity}
                          </div>
                        ))}
                      </td>
                      <td><span className={`badge ${pkg.isActive ? 'badge-success' : 'badge-danger'}`}>{pkg.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(pkg)}><Edit2 size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(pkg.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">{editId ? 'Edit' : 'Tambah'} Paket</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nama Paket *</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Billing (menit) *</label>
                  <input type="number" min={1} className="form-input" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Paket (Rp) *</label>
                  <input type="number" min={0} className="form-input" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Meja (berdasarkan harga per jam) *</label>
                <select className="form-select" value={form.targetHourlyRate} onChange={(e) => setForm((p) => ({ ...p, targetHourlyRate: e.target.value }))}>
                  <option value="">Pilih harga per jam meja</option>
                  {targetRates.map((rate) => (
                    <option key={rate.hourlyRate} value={rate.hourlyRate}>
                      {formatRupiah(rate.hourlyRate)} / jam ({rate.tableNames.length} meja)
                    </option>
                  ))}
                </select>
                {selectedRateMeta && (
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-muted)' }}>
                    Berlaku untuk meja: {selectedRateMeta.tableNames.join(', ')}
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 14, background: 'var(--color-surface-2)' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Komponen billing paket</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Dasar billing otomatis: {formatRupiah(billingUnitPrice)} (durasi × tarif target / 60).
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong>Item F&B Paket</strong>
                  <button className="btn btn-outline btn-sm" onClick={addMenuItemRow}><Plus size={14} /> Tambah Item F&B</button>
                </div>

                {form.items.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Belum ada item F&B bundling.</p>
                ) : (
                  form.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 140px 40px', gap: 8, marginBottom: 10, alignItems: 'end' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Menu F&B</label>
                        <select className="form-select" value={item.menuItemId || ''} onChange={(e) => handleSelectMenu(idx, e.target.value)}>
                          <option value="">Pilih menu bundling</option>
                          {menuItems.map((menu) => (
                            <option key={menu.id} value={menu.id}>{menu.name} • {formatRupiah(menu.price)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Qty</label>
                        <input type="number" min={1} className="form-input" value={item.quantity}
                          onChange={(e) => updateMenuItemRow(idx, { quantity: Number(e.target.value || 1) })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Harga Item (Rp)</label>
                        <input type="number" min={0} className="form-input" value={item.unitPrice}
                          onChange={(e) => updateMenuItemRow(idx, { unitPrice: Number(e.target.value || 0) })} />
                      </div>
                      <button className="btn btn-danger btn-icon" onClick={() => removeMenuItemRow(idx)} disabled={form.items.length === 1}><X size={14} /></button>
                    </div>
                  ))
                )}
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
