'use client';
import DashboardLayout from '@/components/shared/DashboardLayout';
export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={['DEVELOPER']}>{children}</DashboardLayout>;
}
