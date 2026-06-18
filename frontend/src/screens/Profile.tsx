/**
 * <screen name="Profile" layer="frontend" role="any (shared)">
 *   <purpose>Role-agnostic profile: avatar/initials, name/role/contact, settings
 *     rows (static), and sign out. Bound by each role's profile route.</purpose>
 *   <data>useAuth() (user, logout)</data>
 * </screen>
 */
import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth";
import { Txt, Card, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { ROLE_LABEL } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }} showsVerticalScrollIndicator={false}>
        <Card style={{ alignItems: "center", paddingVertical: S.xl }}>
          <View style={styles.avatar}><Txt display size={26} color={C.onBrand}>{initials}</Txt></View>
          <Txt display size={FS.xxl} style={{ marginTop: S.md }}>{user?.name}</Txt>
          <View style={styles.roleTag}>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft}>{ROLE_LABEL[user?.role || ""]}</Txt>
          </View>
          {user?.email ? <Txt color={C.inkMute} style={{ marginTop: S.sm }}>{user.email}</Txt> : null}
          {user?.phone ? <Txt color={C.inkMute} style={{ marginTop: S.sm }}>+91 {user.phone}</Txt> : null}
        </Card>

        <Card style={{ marginTop: S.lg, padding: 0 }}>
          {[
            { icon: "shield", label: "Account security" },
            { icon: "bell", label: "Preferences" },
            { icon: "help-circle", label: "Help & support" },
          ].map((row, i, arr) => (
            <Pressable key={row.label} style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}><Feather name={row.icon as any} size={17} color={C.inkSoft} /></View>
              <Txt weight="medium" style={{ flex: 1 }}>{row.label}</Txt>
              <Feather name="chevron-right" size={18} color={C.inkMute} />
            </Pressable>
          ))}
        </Card>

        <View style={{ marginTop: S.xl }}>
          <Button title="Sign Out" variant="outline" icon="log-out" testID="logout-button"
            onPress={async () => { await logout(); router.replace("/login"); }} />
        </View>
        <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: S.xl }}>
          Interiojunction · Factory-direct interiors
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  roleTag: { marginTop: S.sm, backgroundColor: C.tint, paddingHorizontal: S.md, height: 26, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", padding: S.lg, borderBottomColor: C.divider, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginRight: S.md },
});
