/**
 * <component name="WhatsAppFab" layer="frontend" kind="contact-action">
 *   <purpose>Persistent floating WhatsApp button (bottom-right) mirroring the
 *     website's FAB. Opens a wa.me chat with Interiojunction's number; falls back
 *     to a phone dialer if WhatsApp isn't installed.</purpose>
 *   <props>bottom: lift above tab bars / sticky CTAs.</props>
 * </component>
 */
import React from "react";
import { Pressable, StyleSheet, Linking } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { waUrl, telUrl } from "@/src/brand";
import { shadow } from "@/src/theme";

export function WhatsAppFab({ bottom = 24, message }: { bottom?: number; message?: string }) {
  const open = async () => {
    const url = waUrl(message);
    try {
      const ok = await Linking.canOpenURL(url);
      await Linking.openURL(ok ? url : telUrl());
    } catch {
      Linking.openURL(telUrl()).catch(() => {});
    }
  };
  return (
    <Pressable testID="whatsapp-fab" onPress={open} style={[styles.fab, { bottom }]} hitSlop={8}>
      <FontAwesome name="whatsapp" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#25D366", // WhatsApp green
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowColor: "#25D366",
    shadowOpacity: 0.4,
  },
});
