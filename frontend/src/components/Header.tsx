import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { Txt } from "@/src/components/ui";
import { C, S, FS } from "@/src/theme";

// Sticky, SafeArea-aware screen header used across all role screens.
export function Header({
  title, subtitle, right, onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.back} testID="header-back">
            <Feather name="chevron-left" size={22} color={C.ink} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {subtitle && (
            <Txt size={FS.sm} weight="medium" color={C.inkMute} style={{ letterSpacing: 1 }}>
              {subtitle.toUpperCase()}
            </Txt>
          )}
          <Txt display size={FS.xxl} numberOfLines={1}>{title}</Txt>
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: S.xl,
    paddingBottom: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  back: { marginRight: S.sm, marginBottom: 2 },
});
