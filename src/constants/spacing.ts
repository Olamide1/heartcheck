export const Spacing = {
  // Base spacing scale
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
  
  // Component-specific spacing
  buttonPadding: 16,
  inputPadding: 16,
  cardPadding: 20,
  sectionPadding: 24,
  
  // Legacy spacing for compatibility
  buttonHeight: 56,
  inputHeight: 56,
} as const;

export const Layout = {
  // Screen dimensions
  padding: 24,
  paddingHorizontal: 24,
  paddingVertical: 24,
  
  // Component dimensions
  buttonHeight: 56,
  inputHeight: 56,
  cardHeight: 120,
  
  // Border radius
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Shadows
  shadow: {
    sm: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: 'rgba(0, 0, 0, 0.16)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

export type SpacingKey = keyof typeof Spacing;
export type LayoutKey = keyof typeof Layout;
