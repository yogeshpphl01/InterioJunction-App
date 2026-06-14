import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Modal, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/src/auth";
import { Txt, Card, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { ROLE_LABEL } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

const WEBSITE = "https://www.interiojunction.in";
const SUPPORT_EMAIL = "hello@interiojunction.in";

type Sheet = { title: string; body: React.ReactNode } | null;

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<Sheet>(null);

  const isGuest = !!user?.is_guest;
  const isCustomer = user?.role === "customer";
  const initials = (user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const openWebsite = () => WebBrowser.openBrowserAsync(WEBSITE);
  const openEmail = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support%20request`);

  const signOut = async () => { await logout(); router.replace("/login"); };

  const accountSheet = () => setSheet({
    title: "Account & security",
    body: (
      <>
        <Row icon="user" label="Name" value={user?.name || "—"} />
        {user?.phone ? <Row icon="phone" label="Mobile" value={`+91 ${user.phone}`} /> : null}
        {user?.email ? <Row icon="mail" label="Email" value={user.email} /> : null}
        <Row icon="shield" label="Role" value={ROLE_LABEL[user?.role || ""] || "Customer"} />
        <Row icon="lock" label="Sign-in"
          value={user?.email ? "Email & OTP" : isGuest ? "Guest session" : "Phone OTP"} />
        <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: S.md }}>
          {isGuest
            ? "You're in a guest session. Sign in with your phone number to secure your account and keep your project history."
            : "Your account is secured with a one-time password sent to your registered number. We never store your password in plain text."}
        </Txt>
      </>
    ),
  });

  const prefsSheet = () => setSheet({
    title: "Notifications & preferences",
    body: (
      <>
        <Row icon="bell" label="Project updates" value="On" />
        <Row icon="message-square" label="Service updates" value={isGuest ? "Onboarded clients" : "On"} />
        <Row icon="tag" label="Offers & news" value="On" />
        <Row icon="globe" label="Currency" value="₹ INR" />
        <Row icon="map-pin" label="Region" value="India" />
        <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: S.md }}>
          {"You'll get a push and SMS every time your project moves to a new production stage."}
        </Txt>
      </>
    ),
  });

  const helpSheet = () => setSheet({
    title: "Help & support",
    body: (
      <View style={{ gap: S.sm }}>
        <ActionRow icon="globe" label="Visit interiojunction.in" sub="Catalogue, designs & pricing" onPress={openWebsite} />
        <ActionRow icon="mail" label="Email us" sub={SUPPORT_EMAIL} onPress={openEmail} />
        {isCustomer && (
          <ActionRow icon="message-circle" label="Ask the Design AI" sub="Instant answers on design & cost"
            onPress={() => { setSheet(null); router.push("/(customer)/assistant"); }} />
        )}
        {isCustomer && !isGuest && (
          <ActionRow icon="life-buoy" label="Raise a service request" sub="Track it under Support"
            onPress={() => { setSheet(null); router.push("/(customer)/tickets"); }} />
        )}
        <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: S.sm }}>
          Our support team typically responds within one business day.
        </Txt>
      </View>
    ),
  });

  const menu: { icon: any; label: string; onPress: () => void }[] = [
    { icon: "shield", label: "Account & security", onPress: accountSheet },
    { icon: "bell", label: "Notifications & preferences", onPress: prefsSheet },
    { icon: "help-circle", label: "Help & support", onPress: helpSheet },
    { icon: "globe", label: "Visit our website", onPress: openWebsite },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }} showsVerticalScrollIndicator={false}>
        <Card style={{ alignItems: "center", paddingVertical: S.xl }}>
          <View style={styles.avatar}><Txt display size={26} color={C.onBrand}>{initials}</Txt></View>
          <Txt display size={FS.xxl} style={{ marginTop: S.md }}>{user?.name}</Txt>
          <View style={styles.roleTag}>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft}>{isGuest ? "Guest" : ROLE_LABEL[user?.role || ""]}</Txt>
          </View>
          {user?.email ? <Txt color={C.inkMute} style={{ marginTop: S.sm }}>{user.email}</Txt> : null}
          {user?.phone ? <Txt color={C.inkMute} style={{ marginTop: S.sm }}>+91 {user.phone}</Txt> : null}
        </Card>

        {isGuest && (
          <Card style={{ marginTop: S.lg, backgroundColor: C.tint, borderColor: C.tint }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: S.sm }}>
              <Feather name="user-plus" size={16} color={C.ink} />
              <Txt weight="bold" style={{ marginLeft: S.sm }}>Finish setting up your account</Txt>
            </View>
            <Txt size={FS.sm} color={C.inkSoft} style={{ marginBottom: S.md }}>
              Sign in with your phone number to save your projects and unlock service requests & complaints.
            </Txt>
            <Button title="Sign in with phone" icon="phone" onPress={signOut} testID="guest-upgrade" />
          </Card>
        )}

        <Card style={{ marginTop: S.lg, padding: 0 }}>
          {menu.map((row, i, arr) => (
            <Pressable key={row.label} testID={`profile-${row.icon}`} onPress={row.onPress}
              style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}><Feather name={row.icon} size={17} color={C.inkSoft} /></View>
              <Txt weight="medium" style={{ flex: 1 }}>{row.label}</Txt>
              <Feather name="chevron-right" size={18} color={C.inkMute} />
            </Pressable>
          ))}
        </Card>

        <View style={{ marginTop: S.xl }}>
          <Button title="Sign Out" variant="outline" icon="log-out" testID="logout-button" onPress={signOut} />
        </View>
        <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: S.xl }}>
          Interiojunction · Factory-direct interiors
        </Txt>
      </ScrollView>

      <Modal visible={!!sheet} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setSheet(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
            <View style={styles.handle} />
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: S.lg }}>
              <Txt display size={FS.xxl} style={{ flex: 1 }}>{sheet?.title}</Txt>
              <Pressable onPress={() => setSheet(null)} hitSlop={10}><Feather name="x" size={22} color={C.inkSoft} /></Pressable>
            </View>
            {sheet?.body}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={C.inkMute} style={{ marginRight: S.md }} />
      <Txt color={C.inkSoft} style={{ flex: 1 }}>{label}</Txt>
      <Txt weight="medium" numberOfLines={1} style={{ maxWidth: "55%" }}>{value}</Txt>
    </View>
  );
}

function ActionRow({ icon, label, sub, onPress }: { icon: any; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionRow}>
      <View style={styles.rowIcon}><Feather name={icon} size={17} color={C.inkSoft} /></View>
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{label}</Txt>
        <Txt size={FS.sm} color={C.inkMute}>{sub}</Txt>
      </View>
      <Feather name="chevron-right" size={18} color={C.inkMute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  roleTag: { marginTop: S.sm, backgroundColor: C.tint, paddingHorizontal: S.md, height: 26, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", padding: S.lg, borderBottomColor: C.divider, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginRight: S.md },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.sm },
  actionRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: S.lg },
});
