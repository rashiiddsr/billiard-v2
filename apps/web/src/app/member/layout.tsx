'use client';
import DashboardLayout from '@/components/shared/DashboardLayout';
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={['MEMBER']}>{children}</DashboardLayout>;
}
