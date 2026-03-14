'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Users, ClipboardList, CreditCard, Package,
  UtensilsCrossed, BarChart3, Wallet, Archive, LogOut, User,
  Building2, ScrollText, Timer, ListOrdered, UserCheck,
  CalendarCheck, Clock, ChevronRight, Billiard,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navConfig: Record<string, NavGroup[]> = {
  OWNER: [
    {
      label: 'Utama',
      items: [
        { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
        { label: 'Meja Billiard', href: '/owner/tables', icon: ClipboardList },
        { label: 'Billing Aktif', href: '/owner/billing', icon: Timer },
        { label: 'Transaksi', href: '/owner/transactions', icon: CreditCard },
        { label: 'Riwayat Sesi', href: '/owner/history', icon: ScrollText },
      ],
    },
    {
      label: 'Bisnis',
      items: [
        { label: 'Keuangan', href: '/owner/finance', icon: BarChart3 },
        { label: 'Pengeluaran', href: '/owner/expenses', icon: Wallet },
        { label: 'Paket', href: '/owner/packages', icon: Package },
        { label: 'Menu', href: '/owner/menu', icon: UtensilsCrossed },
        { label: 'Kategori Menu', href: '/owner/menu-categories', icon: ListOrdered },
        { label: 'Stok', href: '/owner/stock', icon: Archive },
      ],
    },
    {
      label: 'SDM & Sistem',
      items: [
        { label: 'Member', href: '/owner/members', icon: Users },
        { label: 'Pengguna', href: '/owner/users', icon: UserCheck },
        { label: 'Absensi', href: '/owner/attendance', icon: CalendarCheck },
        { label: 'Shift Kerja', href: '/owner/shifts', icon: Clock },
        { label: 'Audit Log', href: '/owner/audit', icon: ScrollText },
        { label: 'Perusahaan', href: '/owner/company', icon: Building2 },
      ],
    },
  ],

  DEVELOPER: [
    {
      label: 'Utama',
      items: [
        { label: 'Dashboard', href: '/developer/dashboard', icon: LayoutDashboard },
        { label: 'Kelola Meja', href: '/developer/tables', icon: ClipboardList },
      ],
    },
  ],

  MANAGER: [
    {
      label: 'Utama',
      items: [
        { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
        { label: 'Billing', href: '/manager/billing-management', icon: Timer },
        { label: 'Transaksi', href: '/manager/transactions', icon: CreditCard },
      ],
    },
    {
      label: 'Produk',
      items: [
        { label: 'Menu', href: '/manager/menu', icon: UtensilsCrossed },
        { label: 'Kategori Menu', href: '/manager/menu-categories', icon: ListOrdered },
        { label: 'Paket', href: '/manager/packages', icon: Package },
        { label: 'Stok', href: '/manager/stock', icon: Archive },
        { label: 'Pengeluaran', href: '/manager/expenses', icon: Wallet },
      ],
    },
    {
      label: 'SDM',
      items: [
        { label: 'Member', href: '/manager/members', icon: Users },
        { label: 'Absensi', href: '/manager/attendance', icon: CalendarCheck },
      ],
    },
  ],

  CASHIER: [
    {
      label: 'Operasional',
      items: [
        { label: 'Dashboard', href: '/cashier/dashboard', icon: LayoutDashboard },
        { label: 'Billing', href: '/cashier/billing', icon: Timer },
        { label: 'Order F&B', href: '/cashier/orders', icon: UtensilsCrossed },
        { label: 'Checkout', href: '/cashier/checkout', icon: CreditCard },
        { label: 'Antrian', href: '/cashier/waiting-list', icon: ListOrdered },
        { label: 'Transaksi', href: '/cashier/transactions', icon: ScrollText },
        { label: 'Member', href: '/cashier/members', icon: Users },
      ],
    },
  ],

  MEMBER: [
    {
      label: 'Akun Saya',
      items: [
        { label: 'Dashboard', href: '/member/dashboard', icon: LayoutDashboard },
        { label: 'Riwayat Main', href: '/member/history', icon: ScrollText },
        { label: 'Profil', href: '/member/profile', icon: User },
      ],
    },
  ],
};

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  DEVELOPER: 'Developer',
  MANAGER: 'Manager',
  CASHIER: 'Kasir',
  MEMBER: 'Member',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const groups = navConfig[user.role] || [];
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="layout-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">🎱 Billiard POS</div>
        <div className="sidebar-logo-sub">Premium Management System</div>
      </div>

      {/* Nav Groups */}
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {groups.map((group) => (
          <div className="sidebar-section" key={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="icon" size={17} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Attendance shortcut for staff */}
        {['CASHIER', 'MANAGER', 'OWNER', 'DEVELOPER'].includes(user.role) && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Absensi</div>
            <Link
              href="/attendance"
              className={`sidebar-item ${pathname === '/attendance' ? 'active' : ''}`}
            >
              <CalendarCheck className="icon" size={17} />
              <span style={{ flex: 1 }}>Absen Sekarang</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.name}
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="sidebar-user-avatar">{initials}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div className="sidebar-user-role">{roleLabels[user.role] || user.role}</div>
          </div>
        </div>

        <Link
          href={`/${user.role.toLowerCase()}/profile`}
          className="sidebar-item"
          style={{ marginTop: 4 }}
        >
          <User size={16} />
          <span>Profil Saya</span>
        </Link>

        <button
          onClick={logout}
          className="sidebar-item"
          style={{ marginTop: 2, color: '#F87171', width: '100%' }}
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
