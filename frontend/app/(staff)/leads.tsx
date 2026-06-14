import React, { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, StyleSheet, RefreshControl, Pressable, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Loading, Empty, Button, Field, StatusPill } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { C, S, R, FS } from "@/src/theme";

export default function Leads() {
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [req, setReq] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setLeads(await api<any[]>("/leads")); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim() || !phone.trim()) { setErr("Name and phone are required"); return; }
    setErr(""); setSaving(true);
    try {
      await api("/leads", { method: "POST", body: { name, phone, city, requirement: req } });
      setOpen(false); setName(""); setPhone(""); setCity(""); setReq("");
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Leads" subtitle="Sales Pipeline"
        right={
          <Pressable testID="new-lead-button" onPress={() => setOpen(true)} style={styles.addBtn}>
            <Feather name="plus" size={20} color={C.onBrand} />
          </Pressable>
        }
      />
      {loading ? <Loading /> : (
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
          showsVerticalScrollIndicator={false}
        >
          {leads.length === 0 ? (
            <Empty icon="users" title="No leads yet" subtitle="Add a lead to start tracking your sales pipeline." />
          ) : leads.map((l) => (
            <Card key={l.id} style={{ marginBottom: S.md }} testID={`lead-${l.phone}`}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.avatar}><Txt weight="bold" color={C.onBrand}>{l.name[0]?.toUpperCase()}</Txt></View>
                <View style={{ flex: 1 }}>
                  <Txt weight="medium">{l.name}</Txt>
                  <Txt size={FS.sm} color={C.inkMute}>+91 {l.phone}{l.city ? ` · ${l.city}` : ""}</Txt>
                </View>
                <StatusPill label={l.status} bg={C.tint} fg={C.ink} />
              </View>
              {l.requirement ? <Txt size={FS.sm} color={C.inkSoft} style={{ marginTop: S.sm }}>{l.requirement}</Txt> : null}
            </Card>
          ))}
        </ScrollView>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
              <View style={styles.handle} />
              <Txt display size={FS.xxl} style={{ marginBottom: S.lg }}>New Lead</Txt>
              <Field label="Name" testID="lead-name-input" placeholder="Full name" value={name} onChangeText={setName} />
              <Field label="Phone" testID="lead-phone-input" placeholder="9812300044" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <Field label="City" testID="lead-city-input" placeholder="Pune" value={city} onChangeText={setCity} />
              <Field label="Requirement" testID="lead-req-input" placeholder="e.g. Modular kitchen for 2BHK" value={req} onChangeText={setReq} />
              {err ? <Txt color={C.error} style={{ marginBottom: S.sm }}>{err}</Txt> : null}
              <Button title="Add Lead" onPress={create} loading={saving} testID="create-lead-button" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginRight: S.md },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: S.lg },
});
