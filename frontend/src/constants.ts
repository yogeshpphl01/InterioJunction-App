// Stage pipeline + status helpers shared across screens.
import { C } from "./theme";

export const STAGES = [
  { code: "NEW", label: "Order Confirmed", icon: "check-circle" },
  { code: "CUT", label: "Cutting", icon: "scissors" },
  { code: "EDGE", label: "Edge Banding", icon: "layers" },
  { code: "MACH", label: "Machining", icon: "tool" },
  { code: "FQC", label: "Quality Check", icon: "shield" },
  { code: "PACK", label: "Packing", icon: "package" },
  { code: "DISP", label: "Dispatch", icon: "truck" },
  { code: "SITE", label: "Installation", icon: "home" },
] as const;

export const STAGE_CODES = STAGES.map((s) => s.code);

export const stageLabel = (code: string) =>
  STAGES.find((s) => s.code === code)?.label ?? code;

export const stageIndex = (code: string) => {
  const i = STAGE_CODES.indexOf(code as any);
  return i < 0 ? 0 : i;
};

export function statusColor(status: string): { bg: string; fg: string } {
  const s = (status || "").toLowerCase();
  if (["open", "new", "in_production"].includes(s)) return { bg: C.tint, fg: C.ink };
  if (["resolved", "closed", "done", "completed"].includes(s))
    return { bg: "#DCEAE2", fg: C.success };
  if (["urgent", "high"].includes(s)) return { bg: "#F1DADA", fg: C.error };
  return { bg: C.surface3, fg: C.inkSoft };
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  sales: "Sales Team",
  factory: "Factory Floor",
  customer: "Customer",
};
