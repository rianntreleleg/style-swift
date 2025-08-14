import React, { useEffect } from 'react';

interface FaviconProps {
  href?: string;
}

export default function Favicon({ href = '/favicon.svg' }: FaviconProps) {
  useEffect(() => {
    // Update favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    link.href = href;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [href]);

  return null; // This component doesn't render anything
}
