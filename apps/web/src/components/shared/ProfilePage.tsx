'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Lock, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name); setPhone(user.phoneNumber || ''); }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nama wajib diisi'); return; }
    setSaving(true);
    try {
      const updated = await usersApi.updateMyProfile({ name: name.trim(), phoneNumber: phone.trim() });
      setUser({ ...user!, ...updated });
      toast.success('Profil diperbarui');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current || !pwForm.next) { toast.error('Semua field wajib diisi'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Password baru tidak cocok'); return; }
    if (pwForm.next.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSavingPw(true);
    try {
      await usersApi.updateMyProfile({ currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password berhasil diubah');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal mengubah password'); }
    finally { setSavingPw(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await usersApi.uploadMyPhoto(form);
      setUser({ ...user!, profileImageUrl: res.profileImageUrl });
      toast.success('Foto diperbarui');
    } catch { toast.error('Gagal upload foto'); }
  };

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const roleLabelMap: Record<string, string> = {
    OWNER: 'Owner',
    MANAGER: 'Manager',
    CASHIER: 'Kasir',
    MEMBER: 'Member',
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun, kontak, dan keamanan login</p>
        </div>
      </div>

      <div className="card card-padded mb-4" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--color-primary)', border: '3px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--color-gold)', overflow: 'hidden' }}>
              {user?.profileImageUrl ? <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: 'var(--color-gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
              <Camera size={13} style={{ color: 'var(--color-primary)' }} />
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{roleLabelMap[user?.role || ''] || user?.role}</div>
            {user?.memberNumber && <div style={{ fontSize: 12, color: 'var(--color-gold)', fontFamily: 'monospace', marginTop: 2 }}>{user.memberNumber}</div>}
          </div>
        </div>
        <div className="alert alert-info" style={{ margin: 0, minWidth: 240 }}>
          <span>Tip: gunakan kombinasi huruf, angka, dan simbol agar password lebih aman.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
        {/* Info */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title">Informasi Dasar</h3></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="form-group">
              <label className="form-label"><User size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Nama Lengkap</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label"><Phone size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Nomor HP</label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label"><Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Email</label>
              <input className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} />
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title"><Lock size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Keamanan Password</h3></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {['current', 'next', 'confirm'].map((f, i) => (
              <div className="form-group" key={f}>
                <label className="form-label">{['Password Saat Ini', 'Password Baru', 'Konfirmasi Password Baru'][i]}</label>
                <input type="password" className="form-input" value={(pwForm as any)[f]} onChange={e => setPwForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <button className="btn btn-outline" onClick={handlePasswordChange} disabled={savingPw} style={{ width: '100%', justifyContent: 'center' }}>
              {savingPw ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
