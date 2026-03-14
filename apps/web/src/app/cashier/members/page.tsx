'use client';

import { useState, useEffect, useCallback } from 'react';
import { membersApi } from '@/lib/api';
import { Search, User, Phone, Hash } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  phoneNumber: string;
  memberNumber: string;
  profileImageUrl?: string;
  isActive: boolean;
  _count: { memberSessions: number };
}

export default function CashierMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersApi.list({ search: search || undefined, limit: 30 });
      setMembers(res.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Member</h1>
          <p className="page-subtitle">Cari member untuk billing atau antrian</p>
        </div>
      </div>

      <div className="card card-padded mb-4">
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input
            className="form-input"
            placeholder="Cari nama, no HP, atau nomor member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
            autoFocus
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Mencari...</div>
      ) : members.length === 0 ? (
        <div className="card card-padded empty-state">
          <div className="empty-state-icon"><User size={24} /></div>
          <div>{search ? 'Tidak ada member ditemukan' : 'Belum ada member'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {members.map((m) => (
            <div key={m.id} className="card card-padded" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: m.isActive ? 'var(--color-gold-pale)' : '#f0f0f0',
                border: `2px solid ${m.isActive ? 'var(--color-gold-light)' : '#e0e0e0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15, color: m.isActive ? 'var(--color-primary)' : '#999',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {m.profileImageUrl
                  ? <img src={m.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: m.isActive ? 'var(--color-text)' : 'var(--color-text-light)' }}>
                  {m.name}
                  {!m.isActive && <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: 10 }}>Nonaktif</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Hash size={10} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-gold-hover)' }}>{m.memberNumber}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Phone size={10} />{m.phoneNumber}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', flexShrink: 0 }}>
                {m._count.memberSessions} sesi
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
