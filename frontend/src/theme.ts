/**
 * <module name="theme" layer="frontend" kind="design-tokens">
 *   <purpose>Single source of truth for brand tokens, matched to the live
 *     interiojunction.in mobile site (see screenshots): warm cream canvas,
 *     TERRACOTTA primary CTAs, FOREST-GREEN secondary (call/contact), espresso
 *     brown text, Playfair Display (display, with italic accents) + DM Sans (text).</purpose>
 *   <usage>import { C, S, R, F, FS, shadow } from "@/src/theme";</usage>
 *   <brand-contacts>Phone/WhatsApp +91 86699 90234 · Factory-direct · Pune</brand-contacts>
 * </module>
 */
// Interiojunction theme — aligned to interiojunction.in (cream + terracotta + forest green, editorial).
export const C = {
  // Surfaces — warm cream canvas + white cards + beige tints
  surface: "#FAF5EE",     // page background (warm cream)
  surface2: "#FFFFFF",    // white cards
  surface3: "#EFE8DB",    // beige (selection cards, inputs, subtle fills)

  // Ink — warm espresso browns (NOT pure black, per the site)
  ink: "#3A2A1E",         // headings + primary text
  inkSoft: "#5E4C3D",     // body text
  inkMute: "#9A8B7A",     // captions / muted

  // Dark surfaces (estimate panel, AI promo) — deep espresso
  inverse: "#2C2018",
  onInverse: "#FAF5EE",

  // Brand — TERRACOTTA (the signature CTA color across the site)
  brand: "#C2632E",       // terracotta / burnt sienna — primary buttons & active states
  onBrand: "#FFFFFF",
  brandSoft: "#F0E0D0",   // soft terracotta tint — tags/badges background
  onBrandSoft: "#A04C1E", // terracotta text on tint

  // Forest green — secondary accent (call bar, contact, WhatsApp surrounds)
  forest: "#2E4034",
  onForest: "#FAF5EE",

  // Misc tints
  tint: "#EBE3D5",        // beige pill/chip background
  accent: "#C2632E",      // alias of brand for clarity at call sites

  // Semantic
  success: "#2D6A4F",
  warning: "#B08D57",
  error: "#9B2C2C",
  info: "#5E4C3D",

  // Lines
  border: "#E7DECE",
  borderStrong: "#CBBCA6",
  divider: "#EFE8DB",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
// Softer, rounded geometry to match the website's friendly card/button radii.
export const R = { sm: 6, md: 12, lg: 18, xl: 24, pill: 999 };

// Variable fonts registered in _layout: PlayfairDisplay (display) + DMSans (text).
export const F = {
  display: "PlayfairDisplay",
  text: "DMSans",
};

export const FS = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const shadow = {
  shadowColor: "#3A2A1E",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};
