'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Phone, Mail, Hash, Lock, Camera, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phoneNumber || '');
    setEmail(user.email || '');
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl);
    };
  }, [previewPhotoUrl]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Nama wajib diisi');
    if (!email.trim()) return toast.error('Email wajib diisi');
    if (!phone.trim()) return toast.error('Nomor HP wajib diisi');
    if (newPassword && newPassword.length < 6) return toast.error('Password minimal 6 karakter');

    setSaving(true);
    try {
      let nextPhotoUrl = user?.profileImageUrl || null;
      if (selectedPhoto) {
        const form = new FormData();
        form.append('photo', selectedPhoto);
        const photoRes = await usersApi.uploadMyPhoto(form);
        nextPhotoUrl = photoRes.profileImageUrl;
      }

      const payload: any = {
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim().toLowerCase(),
      };
      if (newPassword.trim()) payload.password = newPassword.trim();

      const updated = await usersApi.updateMyProfile(payload);
      setUser({ ...user!, ...updated, profileImageUrl: nextPhotoUrl });
      setSelectedPhoto(null);
      if (previewPhotoUrl) {
        URL.revokeObjectURL(previewPhotoUrl);
        setPreviewPhotoUrl(null);
      }
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
    e.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewPhotoUrl(objectUrl);
    setSelectedPhoto(file);
    toast.success('Foto dipilih. Klik "Simpan Profil" untuk menerapkan.');
  };

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const photoUrl = previewPhotoUrl || resolveMediaUrl(user.profileImageUrl);
  const memberNumber = user.memberNumber?.trim() || '';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun Anda</p>
        </div>
      </div>

      <div className="member-card-visual mb-6">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(201,168,76,0.25)',
                  border: '2px solid var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--color-gold)',
                  overflow: 'hidden',
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initials}
              </div>

              <label
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--color-gold)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: saving ? 'wait' : 'pointer',
                  border: '2px solid white',
                  opacity: saving ? 0.7 : 1,
                }}
                title={saving ? 'Sedang menyimpan...' : 'Ubah foto profil'}
              >
                <Camera size={12} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  disabled={saving}
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Profil Akun
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'Playfair Display, serif' }}>
                {user.name}
              </div>
            </div>
          </div>

          <div className="member-number">{memberNumber}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <h3 className="card-title">Informasi Akun</h3>
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Hash size={16} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nomor Member</div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, color: 'var(--color-primary)' }}>{memberNumber}</div>
              </div>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                gap: 14,
              }}
            >
              <div className="form-group profile-grid-item" style={{ marginBottom: 0, gridColumn: 'span 4' }}>
                <label className="form-label"><User size={14} style={{ display: 'inline', marginRight: 4 }} /> Nama Lengkap</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="form-group profile-grid-item" style={{ marginBottom: 0, gridColumn: 'span 4' }}>
                <label className="form-label"><Phone size={14} style={{ display: 'inline', marginRight: 4 }} /> Nomor HP</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="form-group profile-grid-item" style={{ marginBottom: 0, gridColumn: 'span 4' }}>
                <label className="form-label"><Mail size={14} style={{ display: 'inline', marginRight: 4 }} /> Email</label>
                <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="form-group profile-grid-item" style={{ marginBottom: 0, gridColumn: 'span 4' }}>
                <label className="form-label"><Lock size={14} style={{ display: 'inline', marginRight: 4 }} /> Password Baru (opsional)</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid-item {
            grid-column: span 8 !important;
          }
        }
      `}</style>
    </div>
  );
}
