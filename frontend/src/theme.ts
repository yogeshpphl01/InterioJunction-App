/**
 * <module name="theme" layer="frontend" kind="design-tokens">
 *   <purpose>Single source of truth for brand tokens — colors (C), spacing (S),
 *     radii (R), fonts (F), font sizes (FS), shadow. Mirrors design_guidelines.json
 *     and the interiojunction.in palette (cream #FDFAF6 + black, editorial).</purpose>
 *   <usage>import { C, S, R, F, FS, shadow } from "@/src/theme";</usage>
 * </module>
 */
// Interiojunction theme — aligned to interiojunction.in (warm cream + black, editorial).
export const C = {
  surface: "#FDFAF6",
  surface2: "#FFFFFF",
  surface3: "#F0F0F0",
  ink: "#000000",
  inkSoft: "#4A4A4A",
  inkMute: "#8A857E",
  inverse: "#1A1A1A",
  onInverse: "#FDFAF6",
  brand: "#000000",
  onBrand: "#FDFAF6",
  tint: "#EAE4DB",
  success: "#2D6A4F",
  warning: "#B08D57",
  error: "#9B2C2C",
  info: "#4A4A4A",
  border: "#E8E8E8",
  borderStrong: "#CCCCCC",
  divider: "#F0F0F0",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 0, md: 6, lg: 12, xl: 20, pill: 999 };

// Variable fonts registered in _layout: PlayfairDisplay (display) + DMSans (text).
export const F = {
  display: "PlayfairDisplay",
  text: "DMSans",
};

export const FS = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
