'use client';

import { useAuth } from '@/lib/auth';
import { Phone, Mail, Hash, Calendar, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function MemberProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const joinDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Informasi akun member Anda</p>
        </div>
      </div>

      {/* Kartu Member Visual */}
      <div className="member-card-visual mb-6">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(201,168,76,0.25)',
              border: '2px solid var(--color-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'var(--color-gold)',
              overflow: 'hidden',
            }}>
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Kartu Member
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'Playfair Display, serif' }}>
                {user.name}
              </div>
            </div>
          </div>

          <div className="member-number">{user.memberNumber || '—'}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>
            BILLIARD PREMIUM MEMBER
          </div>
        </div>
      </div>

      {/* Detail Info */}
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
                <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, color: 'var(--color-primary)' }}>
                  {user.memberNumber || '—'}
                </div>
              </div>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={16} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nomor HP</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.phoneNumber || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={16} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-light)', textAlign: 'center', marginTop: 24 }}>
        Untuk mengubah data, hubungi kasir atau manager
      </p>
    </div>
  );
}
