'use client';

import { useEffect } from 'react';
import { companyApi } from '@/lib/api';

function resolveAssetUrl(url?: string | null) {
  const cleaned = url?.trim();
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return '/default-brand.svg';
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const origin = apiUrl.replace('/api/v1', '');
  return `${origin}${cleaned.startsWith('/') ? '' : '/'}${cleaned}`;
}

export default function BrandAssetsSync() {
  useEffect(() => {
    const applyBrand = async () => {
      try {
        const profile = await companyApi.getPublicProfile();
        const name = profile?.name || 'Billiard POS';
        document.title = name;

        const logo = resolveAssetUrl(profile?.logoUrl);
        let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = logo;
      } catch {
        // ignore brand sync errors
      }
    };

    applyBrand();
    window.addEventListener('company-brand-updated', applyBrand);
    return () => window.removeEventListener('company-brand-updated', applyBrand);
  }, []);

  return null;
}
