import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';
import BrandAssetsSync from '@/components/shared/BrandAssetsSync';

export const metadata: Metadata = {
  title: 'Billiard POS',
  description: 'Premium Billiard Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <BrandAssetsSync />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                boxShadow: 'var(--shadow-md)',
              },
              success: {
                iconTheme: { primary: 'var(--color-success)', secondary: 'white' },
              },
              error: {
                iconTheme: { primary: 'var(--color-danger)', secondary: 'white' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
