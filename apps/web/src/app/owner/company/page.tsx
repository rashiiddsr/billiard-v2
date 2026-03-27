'use client';
import { useState, useEffect } from 'react';
import { companyApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2, ImagePlus } from 'lucide-react';

const DEFAULT_LOGO = '/default-brand.svg';

function resolveLogo(url?: string | null) {
  const cleaned = url?.trim();
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return DEFAULT_LOGO;
  return cleaned;
}

export default function CompanyPage() {
  const [form, setForm] = useState({ name: '', address: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [openHour, setOpenHour] = useState('10:00');
  const [closeHour, setCloseHour] = useState('23:00');

  useEffect(() => {
    companyApi.getProfile().then((p) => {
      if (p) {
        setForm({ name: p.name || '', address: p.address || '', phoneNumber: p.phoneNumber || '' });
        setLogoPreview(p.logoUrl || '');
      }
      const setting = localStorage.getItem('company-operational-hours');
      if (setting) {
        const parsed = JSON.parse(setting);
        if (parsed?.openHour) setOpenHour(parsed.openHour);
        if (parsed?.closeHour) setCloseHour(parsed.closeHour);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyApi.updateProfile(form);
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        const res = await companyApi.uploadLogo(fd);
        setLogoPreview(res.logoUrl || '');
      }
      localStorage.setItem('company-operational-hours', JSON.stringify({ openHour, closeHour }));
      toast.success('Data perusahaan disimpan');
      window.dispatchEvent(new Event('company-brand-updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const resetLogo = async () => {
    try {
      await companyApi.resetLogo();
      setLogoPreview('');
      setLogoFile(null);
      toast.success('Logo dikembalikan ke default');
      window.dispatchEvent(new Event('company-brand-updated'));
    } catch {
      toast.error('Gagal reset logo');
    }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Data Perusahaan</h1></div></div>
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title"><Building2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Informasi Bisnis</h3></div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          {loading ? <p>Memuat...</p> : (
            <>
              {[['name', 'Nama Perusahaan'], ['address', 'Alamat'], ['phoneNumber', 'Nomor HP']].map(([f, l]) => (
                <div key={f} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Jam Operasional Buka</label>
                  <input type="time" className="form-input" value={openHour} onChange={(e) => setOpenHour(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jam Operasional Tutup</label>
                  <input type="time" className="form-input" value={closeHour} onChange={(e) => setCloseHour(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label"><ImagePlus size={14} style={{ display: 'inline', marginRight: 5 }} />Logo Perusahaan</label>
                <input className="form-input" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  if (file) setLogoPreview(URL.createObjectURL(file));
                }} />
                <small style={{ color: 'var(--color-text-muted)' }}>Rekomendasi: PNG/JPG rasio 1:1, ideal 512x512 (minimal 256x256). Logo dipakai untuk sidebar, waiting list TV, dan favicon aplikasi.</small>
                <div style={{ marginTop: 10 }}>
                  <img
                    src={resolveLogo(logoPreview)}
                    alt="Preview logo"
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-border)' }}
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(DEFAULT_LOGO)) return;
                      event.currentTarget.src = DEFAULT_LOGO;
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={resetLogo}>Reset Logo</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Data Perusahaan'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
