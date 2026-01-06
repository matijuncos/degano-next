// Sistema de breakpoints estándar para responsive design
// Alineado con Mantine UI defaults

export const BREAKPOINTS = {
  xs: '0px',      // Mobile pequeño (320px+)
  sm: '768px',    // Tablet (iPad, tablets Android)
  md: '1024px',   // Laptop pequeña
  lg: '1440px',   // Desktop
  xl: '1920px'    // Desktop grande
};

export const MEDIA_QUERIES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  laptop: '(min-width: 1024px) and (max-width: 1439px)',
  desktop: '(min-width: 1440px)'
};

// Helper para usar en componentes
export const getBreakpointValue = (breakpoint: keyof typeof BREAKPOINTS): string => {
  return BREAKPOINTS[breakpoint];
};
