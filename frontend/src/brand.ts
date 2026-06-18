/**
 * <module name="brand" layer="frontend" kind="constants">
 *   <purpose>Single source of truth for Interiojunction brand identity + contact
 *     details + service catalogue + kitchen-calculator config, transcribed from the
 *     live interiojunction.in site. Imported by the wordmark, contact actions,
 *     services showcase and the Kitchen Calculator so copy stays consistent.</purpose>
 * </module>
 */

export const BRAND = {
  name: "Interiojunction",
  tagline: "FACTORY-DIRECT · PUNE",
  city: "Pune",
  phoneDisplay: "+91 86699 90234",
  phoneTel: "+918669990234",          // for tel:
  whatsapp: "918669990234",           // for https://wa.me/<number>
  // Indicative-pricing disclaimer used on the website's calculator.
  pricingNote:
    "Indicative pricing. Includes Greenlam MFC HMR boards + Hettich hardware + installation. " +
    "Final quote after free 3D design session. T&C apply.",
};

// Deep links for the floating call / WhatsApp actions.
export const waUrl = (text = "Hi Interiojunction, I'd like to know more.") =>
  `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;
export const telUrl = () => `tel:${BRAND.phoneTel}`;

// Services / "Spaces" offered on the site (used by the home showcase).
export const SERVICES = [
  {
    title: "Modular Kitchen",
    blurb: "Factory-direct modular kitchens, built to your layout.",
    tag: "From ₹1.8L",
    img: "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  },
  {
    title: "Modular Wardrobe",
    blurb: "Sliding & openable wardrobes tailored to your room.",
    tag: "From ₹90k",
    img: "https://images.unsplash.com/photo-1708397016786-8916880649b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  },
  {
    title: "Full Home Interior",
    blurb: "Complete turnkey — every room, one team. 45 days from design approval. 1BHK to 4BHK.",
    tag: "2BHK from ₹4.5L",
    img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  },
];

// ---- Kitchen Calculator config (mirrors the site's 3-step estimator) ----
// Layouts with an indicative running-feet baseline used to pre-fill the estimate.
export const KITCHEN_LAYOUTS = [
  { key: "L-Shaped", desc: "Two walls at a right angle. Most popular layout for Indian homes.", tag: "MOST POPULAR", baseRft: 12 },
  { key: "Parallel", desc: "Two parallel counters facing each other — great for narrow spaces.", tag: "SPACE-EFFICIENT", baseRft: 12 },
  { key: "Straight", desc: "Single wall of cabinets — perfect for compact kitchens and studio apartments.", tag: "COMPACT", baseRft: 8 },
  { key: "U-Shaped", desc: "Three walls of cabinets — maximum storage and counter space.", tag: "MAX STORAGE", baseRft: 16 },
];

// Finish → indicative ₹ per running foot (base + wall cabinets, incl. hardware & install).
// Calibrated so ~12 rft Membrane ≈ the "from ₹1.8L" the site advertises. Indicative only.
export const KITCHEN_FINISHES = [
  { key: "Membrane", ratePerRft: 16000 },
  { key: "Laminate", ratePerRft: 18500 },
  { key: "Acrylic", ratePerRft: 24000 },
  { key: "PU", ratePerRft: 29000 },
];

// Optional add-ons → indicative flat ₹.
export const KITCHEN_ADDONS = [
  { key: "Tall unit", price: 28000 },
  { key: "Chimney + hob", price: 35000 },
  { key: "Pull-out baskets", price: 18000 },
  { key: "Loft storage", price: 22000 },
];

// Indicative estimate (clearly a ballpark; real quote after free 3D session).
export function estimateKitchen(rft: number, ratePerRft: number, addonTotal: number): number {
  if (!rft || rft <= 0) return 0;
  return Math.round((rft * ratePerRft + addonTotal) / 1000) * 1000;
}

// "₹4,50,000" Indian-format currency. Hand-rolled grouping (no reliance on
// Intl/toLocaleString, which is inconsistent on React Native's Hermes engine).
export function inr(n: number): string {
  if (!n) return "—";
  const s = String(Math.round(n));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return "₹" + grouped;
}
