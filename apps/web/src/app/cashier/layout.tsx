'use client';
import DashboardLayout from '@/components/shared/DashboardLayout';
export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={['CASHIER']}>{children}</DashboardLayout>;
}
