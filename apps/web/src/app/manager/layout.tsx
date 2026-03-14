'use client';
import DashboardLayout from '@/components/shared/DashboardLayout';
export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={['MANAGER']}>{children}</DashboardLayout>;
}
