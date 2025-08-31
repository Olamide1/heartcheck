export const Colors = {
  // Primary Colors - Modern Sage Green
  primarySage: '#10B981',
  primarySageDark: '#059669',
  primarySageLight: '#34D399',
  
  // Secondary Colors - Warm Accents
  secondaryCoral: '#F87171',
  secondaryAmber: '#F59E0B',
  secondaryBlue: '#3B82F6',
  
  // Background Colors - Modern Neutrals
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  
  // Text Colors - Better Contrast
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Border & Divider Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F1F5F9',
  
  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowElevated: 'rgba(0, 0, 0, 0.12)',
  
  // Gradient Colors
  gradientStart: '#10B981',
  gradientEnd: '#059669',
  gradientLight: '#34D399',
  
  // Legacy Colors (keeping for compatibility)
  softCream: '#FAFAFA',
  warmGrayText: '#1F2937',
  coolGrayText: '#6B7280',
  warmGray10: '#F8FAFC',
  warmGray20: '#F1F5F9',
  alertCoral: '#F87171',
};

export type ColorKey = keyof typeof Colors;
