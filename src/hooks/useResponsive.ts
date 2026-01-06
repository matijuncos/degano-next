'use client';

import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

/**
 * Hook personalizado para detectar breakpoints responsive
 * Basado en el sistema de breakpoints de Mantine
 *
 * @returns {Object} Objeto con booleanos para cada breakpoint
 * - isMobile: true si el viewport es <768px
 * - isTablet: true si el viewport es entre 768px y 1023px
 * - isDesktop: true si el viewport es >=1024px
 *
 * @example
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 *
 * return <DesktopLayout />;
 */
export function useResponsive() {
  const theme = useMantineTheme();

  // Mobile: <768px (base to sm)
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Tablet: 768px - 1023px (sm to md)
  const isTablet = useMediaQuery(
    `(min-width: ${theme.breakpoints.sm}) and (max-width: ${theme.breakpoints.md})`
  );

  // Desktop: >=1024px (md and up)
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);

  return { isMobile, isTablet, isDesktop };
}
