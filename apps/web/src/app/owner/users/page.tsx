'use client';
import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { asArray } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, X } from 'lucide-react';

const ROLES = ['OWNER','MANAGER','CASHIER','DEVELOPER'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', role: 'CASHIER', password: '', isActive: true });
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setUsers(asArray(await usersApi.list())); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ name:'',email:'',phoneNumber:'',role:'CASHIER',password:'',isActive:true }); setShowModal(true); };
  const openEdit = (u: any) => { setEditId(u.id); setForm({ name:u.name,email:u.email,phoneNumber:u.phoneNumber,role:u.role,password:'',isActive:u.isActive }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editId && !form.password)) { toast.error('Data tidak lengkap'); return; }
    setBusy(true);
    try {
      const data: any = { name: form.name, email: form.email, phoneNumber: form.phoneNumber, role: form.role, isActive: form.isActive };
      if (form.password) data.password = form.password;
      if (editId) { await usersApi.update(editId, data); toast.success('User diperbarui'); }
      else { await usersApi.create(data); toast.success('User dibuat'); }
      setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const roleColors: Record<string,string> = { OWNER:'badge-danger',MANAGER:'badge-info',CASHIER:'badge-warning',DEVELOPER:'badge-neutral' };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Manajemen Pengguna</h1></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah User</button></div>
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Nama</th><th>Email</th><th>No HP</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} style={{ textAlign:'center',padding:32 }}>Memuat...</td></tr>
          : users.filter(u => u.role !== 'MEMBER').map((u:any) => (
            <tr key={u.id}>
              <td style={{ fontWeight:600 }}>{u.name}</td>
              <td style={{ fontSize:12 }}>{u.email}</td>
              <td>{u.phoneNumber}</td>
              <td><span className={`badge ${roleColors[u.role]||'badge-neutral'}`}>{u.role}</span></td>
              <td><span className={`badge ${u.isActive?'badge-success':'badge-danger'}`}>{u.isActive?'Aktif':'Nonaktif'}</span></td>
              <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)}><Edit2 size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:20 }}>
          <div className="card" style={{ width:'100%',maxWidth:460 }}>
            <div className="card-header" style={{ display:'flex',justifyContent:'space-between' }}><h3 className="card-title">{editId?'Edit':'Tambah'} User</h3><button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><X size={18}/></button></div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Nama</label><input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">No HP</label><input className="form-input" value={form.phoneNumber} onChange={e=>setForm(p=>({...p,phoneNumber:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Password {editId&&'(kosongkan jika tidak diubah)'}</label><input type="password" className="form-input" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.isActive?'true':'false'} onChange={e=>setForm(p=>({...p,isActive:e.target.value==='true'}))}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
              </div>
            </div>
            <div className="card-footer" style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
