/**
 * <module name="ui" layer="frontend" kind="design-system">
 *   <purpose>Reusable brand primitives used everywhere. Keep visual changes here
 *     so they propagate app-wide.</purpose>
 *   <exports>Txt · Button (primary|outline|ghost) · Field · Chip · StatusPill ·
 *     Card · Empty · Loading</exports>
 * </module>
 */
import React from "react";
import {
  Text, View, Pressable, ActivityIndicator, StyleSheet, TextInput,
  TextInputProps, ViewStyle, StyleProp,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, S, R, F, FS, shadow } from "@/src/theme";

export function Txt({
  children, style, weight = "regular", size = FS.base, color = C.ink, display, numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  weight?: "regular" | "medium" | "bold";
  size?: number;
  color?: string;
  display?: boolean;
  numberOfLines?: number;
}) {
  const fontWeight = weight === "bold" ? "700" : weight === "medium" ? "600" : "400";
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: display ? F.display : F.text, fontSize: size, color, fontWeight }, style]}
    >
      {children}
    </Text>
  );
}

export function Button({
  title, onPress, variant = "primary", loading, disabled, icon, style, testID,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        st.btn,
        isPrimary && { backgroundColor: C.brand },
        isOutline && { backgroundColor: "transparent", borderWidth: 1, borderColor: C.ink },
        variant === "ghost" && { backgroundColor: C.surface3 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? C.onBrand : C.ink} />
      ) : (
        <View style={st.btnRow}>
          {icon && (
            <Feather name={icon} size={16} color={isPrimary ? C.onBrand : C.ink} style={{ marginRight: 8 }} />
          )}
          <Txt weight="medium" size={FS.lg} color={isPrimary ? C.onBrand : C.ink}>
            {title}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

export const Field = React.forwardRef<TextInput, TextInputProps & { label?: string; icon?: keyof typeof Feather.glyphMap }>(
  ({ label, icon, style, ...props }, ref) => (
    <View style={{ marginBottom: S.lg }}>
      {label && (
        <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>
          {label.toUpperCase()}
        </Txt>
      )}
      <View style={st.fieldWrap}>
        {icon && <Feather name={icon} size={18} color={C.inkMute} style={{ marginRight: S.sm }} />}
        <TextInput
          ref={ref}
          placeholderTextColor={C.inkMute}
          style={[{ flex: 1, fontFamily: F.text, fontSize: FS.lg, color: C.ink, paddingVertical: 0 }, style]}
          {...props}
        />
      </View>
    </View>
  )
);
Field.displayName = "Field";

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[st.chip, active ? { backgroundColor: C.brand, borderColor: C.brand } : { backgroundColor: "transparent", borderColor: C.borderStrong }]}
    >
      <Txt size={FS.sm} weight="medium" color={active ? C.onBrand : C.inkSoft}>{label}</Txt>
    </Pressable>
  );
}

export function StatusPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[st.pill, { backgroundColor: bg }]}>
      <Txt size={FS.sm} weight="medium" color={fg}>{label}</Txt>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[st.card, style]}>{children}</View>;
}

export function Empty({ icon = "inbox", title, subtitle }: { icon?: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={st.empty}>
      <View style={st.emptyIcon}>
        <Feather name={icon} size={26} color={C.inkMute} />
      </View>
      <Txt display size={FS.xl} style={{ marginBottom: 6, textAlign: "center" }}>{title}</Txt>
      {subtitle && <Txt size={FS.base} color={C.inkMute} style={{ textAlign: "center", maxWidth: 280 }}>{subtitle}</Txt>}
    </View>
  );
}

export function Loading() {
  return (
    <View style={st.loading}>
      <ActivityIndicator color={C.ink} />
    </View>
  );
}

const st = StyleSheet.create({
  btn: { height: 54, borderRadius: R.md, alignItems: "center", justifyContent: "center", paddingHorizontal: S.lg },
  btnRow: { flexDirection: "row", alignItems: "center" },
  fieldWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.surface2,
    borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52,
  },
  chip: {
    height: 36, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pill: { paddingHorizontal: S.md, height: 26, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, ...shadow },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: S.xxxl, paddingHorizontal: S.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginBottom: S.lg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: S.xxxl },
});
