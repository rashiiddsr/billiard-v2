'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Lock, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phoneNumber || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Nama wajib diisi');
    if (!email.trim()) return toast.error('Email wajib diisi');
    if (newPassword && newPassword.length < 6) return toast.error('Password minimal 6 karakter');

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim().toLowerCase(),
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const updated = await usersApi.updateMyProfile(payload);
      setUser({ ...user!, ...updated });
      setNewPassword('');
      toast.success('Profil berhasil disimpan');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
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
    } catch {
      toast.error('Gagal upload foto');
    }
  };

  const initials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div>
      <div className="page-header" style={{ justifyContent: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ textAlign: 'left' }}>Profil Saya</h1>
          <p className="page-subtitle" style={{ textAlign: 'left' }}>Kelola informasi akun, kontak, dan keamanan login</p>
        </div>
      </div>

      <div className="card card-padded mb-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--color-primary)', border: '3px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--color-gold)', overflow: 'hidden' }}>
            {user?.profileImageUrl ? <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: 'var(--color-gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
            <Camera size={13} style={{ color: 'var(--color-primary)' }} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </label>
        </div>
        <div><strong>{user?.name}</strong></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Informasi Profil</h3></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label"><User size={13} style={{ display: 'inline', marginRight: 4 }} /> Nama Lengkap</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><Phone size={13} style={{ display: 'inline', marginRight: 4 }} /> Nomor HP</label>
            <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><Mail size={13} style={{ display: 'inline', marginRight: 4 }} /> Email</label>
            <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={13} style={{ display: 'inline', marginRight: 4 }} /> Password Baru (opsional)</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kosongkan jika tidak diubah"
            />
          </div>
        </div>
        <div className="card-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </div>
    </div>
  );
}
