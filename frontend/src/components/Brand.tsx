/**
 * <component name="Brand" layer="frontend" kind="identity">
 *   <purpose>The Interiojunction wordmark exactly as on the website: serif
 *     "Interiojunction" (Playfair) over the letter-spaced "FACTORY-DIRECT · PUNE"
 *     sub-label. Use `onDark` for cream-on-dark hero/header placements.</purpose>
 * </component>
 */
import React from "react";
import { View } from "react-native";
import { Txt } from "@/src/components/ui";
import { BRAND } from "@/src/brand";
import { C, FS } from "@/src/theme";

export function Brand({ size = FS.xxl, onDark = false }: { size?: number; onDark?: boolean }) {
  const main = onDark ? C.onInverse : C.ink;
  const sub = onDark ? "rgba(253,250,246,0.7)" : C.inkMute;
  return (
    <View>
      <Txt display size={size} color={main} style={{ lineHeight: size * 1.05 }}>
        {BRAND.name}
      </Txt>
      <Txt size={Math.max(9, size * 0.32)} weight="medium" color={sub} style={{ letterSpacing: 2, marginTop: 2 }}>
        {BRAND.tagline}
      </Txt>
    </View>
  );
}
