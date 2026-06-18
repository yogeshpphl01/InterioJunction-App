/**
 * <screen route="/(customer)/tickets" name="Tickets" role="customer">
 *   <purpose>List + create service tickets (object-scoped to this customer).</purpose>
 *   <data>GET /tickets · POST /tickets</data>
 *   <sections>ticket-list · new-request-modal (type chips, subject, details)</sections>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, StyleSheet, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Loading, Empty, Button, StatusPill, Field } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { statusColor } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

const TYPES = ["service", "complaint", "install", "replacement"];

export default function Tickets() {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("service");
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setTickets(await api<any[]>("/tickets")); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!subject.trim()) { setErr("Please add a subject"); return; }
    setErr(""); setSubmitting(true);
    try {
      await api("/tickets", { method: "POST", body: { type, subject, description: desc } });
      setOpen(false); setSubject(""); setDesc(""); setType("service");
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Support" subtitle="Service & Tickets"
        right={
          <Pressable testID="new-ticket-button" onPress={() => setOpen(true)} style={styles.addBtn}>
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
          {tickets.length === 0 ? (
            <Empty icon="life-buoy" title="No tickets yet" subtitle="Raise a service request and our team will get back to you." />
          ) : tickets.map((t) => {
            const sc = statusColor(t.status);
            return (
              <Card key={t.id} style={{ marginBottom: S.md }} testID={`ticket-${t.ticket_no}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.tIcon}><Feather name="tool" size={16} color={C.inkSoft} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium" numberOfLines={1}>{t.subject}</Txt>
                    <Txt size={FS.sm} color={C.inkMute}>{t.ticket_no} · {t.type}</Txt>
                  </View>
                  <StatusPill label={t.status} bg={sc.bg} fg={sc.fg} />
                </View>
                {t.description ? <Txt size={FS.sm} color={C.inkSoft} style={{ marginTop: S.sm }}>{t.description}</Txt> : null}
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
            <View style={styles.handle} />
            <Txt display size={FS.xxl} style={{ marginBottom: S.lg }}>New Request</Txt>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>TYPE</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingBottom: S.lg }}>
              {TYPES.map((tp) => (
                <Pressable key={tp} onPress={() => setType(tp)}
                  style={[styles.typeChip, type === tp && { backgroundColor: C.ink, borderColor: C.ink }]}>
                  <Txt size={FS.sm} weight="medium" color={type === tp ? C.onBrand : C.inkSoft} style={{ textTransform: "capitalize" }}>{tp}</Txt>
                </Pressable>
              ))}
            </ScrollView>
            <Field label="Subject" testID="ticket-subject-input" placeholder="e.g. Drawer alignment" value={subject} onChangeText={setSubject} />
            <View style={{ marginBottom: S.lg }}>
              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>DETAILS</Txt>
              <TextInput
                testID="ticket-desc-input"
                placeholder="Describe the issue…"
                placeholderTextColor={C.inkMute}
                value={desc} onChangeText={setDesc}
                multiline
                style={styles.textarea}
              />
            </View>
            {err ? <Txt color={C.error} style={{ marginBottom: S.sm }}>{err}</Txt> : null}
            <Button title="Submit Request" onPress={submit} loading={submitting} testID="submit-ticket-button" />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  tIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginRight: S.md },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: S.lg },
  typeChip: { height: 36, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textarea: { minHeight: 90, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md, fontFamily: "DMSans", fontSize: FS.lg, color: C.ink, textAlignVertical: "top" },
});
