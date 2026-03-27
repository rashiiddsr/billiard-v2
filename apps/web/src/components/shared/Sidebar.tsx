'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Users, ClipboardList, CreditCard, Package,
  UtensilsCrossed, BarChart3, Wallet, Archive, User,
  Building2, ScrollText, Timer, ListOrdered, UserCheck,
  CalendarCheck, Clock, ChevronRight, MonitorSmartphone
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
        { label: 'Display TV', href: '/owner/waiting-display', icon: MonitorSmartphone },
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
        { label: 'Display TV', href: '/owner/waiting-display', icon: MonitorSmartphone },
      ],
    },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const groups = navConfig[user.role] || [];

  return (
    <aside className="layout-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">🎱 Billiard POS</div>
        <div className="sidebar-logo-sub">Premium Management System</div>
      </div>

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

      <div className="sidebar-footer">
        <Link
          href={`/${user.role.toLowerCase()}/profile`}
          className="sidebar-item"
          style={{ marginTop: 4 }}
        >
          <User size={16} />
          <span>Profil Saya</span>
        </Link>
      </div>
    </aside>
  );
}
