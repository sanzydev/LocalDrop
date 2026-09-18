import { useEffect, useState } from 'react';

export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 680;
  const isTablet = windowWidth >= 680 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  return { isMobile, isTablet, isDesktop, windowWidth };
}
