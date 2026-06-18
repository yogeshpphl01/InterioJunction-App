/**
 * <screen name="ProjectsList" layer="frontend" role="staff|factory (shared)">
 *   <purpose>Shared project list. `showCreate` toggles the new-project modal
 *     (staff only). Reused by /(staff)/projects and /(factory)/projects.</purpose>
 *   <data>GET /projects · POST /projects</data>
 *   <sections>project-list · new-project-modal (title, category chips, customer)</sections>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, StyleSheet, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Loading, Empty, Button, Field, StatusPill } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { stageLabel } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

const CATS = ["Modular Kitchen", "Modular Wardrobe", "Full Home Interior"];

export default function ProjectsList({ showCreate, title = "Projects", subtitle }: { showCreate?: boolean; title?: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setProjects(await api<any[]>("/projects")); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!pTitle.trim() || !cName.trim() || !cPhone.trim()) { setErr("Please fill all fields"); return; }
    setErr(""); setSaving(true);
    try {
      await api("/projects", { method: "POST", body: { title: pTitle, category: cat, customer_name: cName, customer_phone: cPhone, parts: 6 } });
      setOpen(false); setPTitle(""); setCName(""); setCPhone("");
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title={title} subtitle={subtitle}
        right={showCreate ? (
          <Pressable testID="new-project-button" onPress={() => setOpen(true)} style={styles.addBtn}>
            <Feather name="plus" size={20} color={C.onBrand} />
          </Pressable>
        ) : undefined}
      />
      {loading ? <Loading /> : (
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
          showsVerticalScrollIndicator={false}
        >
          {projects.length === 0 ? (
            <Empty icon="grid" title="No projects yet" subtitle={showCreate ? "Create a project to get started." : "Projects will appear here."} />
          ) : projects.map((p) => (
            <Pressable key={p.id} testID={`project-row-${p.project_code}`} onPress={() => router.push(`/project/${p.project_code}`)}>
              <Card style={{ marginBottom: S.md }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={FS.sm} weight="medium" color={C.inkMute} style={{ letterSpacing: 0.5 }}>{p.category.toUpperCase()}</Txt>
                    <Txt display size={FS.lg} numberOfLines={1} style={{ marginTop: 2 }}>{p.title}</Txt>
                    <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 2 }}>{p.project_code} · {p.customer_name}</Txt>
                  </View>
                  <StatusPill label={stageLabel(p.current_stage)} bg={C.tint} fg={C.ink} />
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${p.progress}%` }]} /></View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
              <View style={styles.handle} />
              <Txt display size={FS.xxl} style={{ marginBottom: S.lg }}>New Project</Txt>
              <Field label="Project title" testID="project-title-input" placeholder="e.g. L-Shaped Kitchen" value={pTitle} onChangeText={setPTitle} />
              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>CATEGORY</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingBottom: S.lg }}>
                {CATS.map((c) => (
                  <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && { backgroundColor: C.ink, borderColor: C.ink }]}>
                    <Txt size={FS.sm} weight="medium" color={cat === c ? C.onBrand : C.inkSoft}>{c}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
              <Field label="Customer name" testID="customer-name-input" placeholder="Full name" value={cName} onChangeText={setCName} />
              <Field label="Customer phone" testID="customer-phone-input" placeholder="9000000003" keyboardType="phone-pad" value={cPhone} onChangeText={setCPhone} />
              {err ? <Txt color={C.error} style={{ marginBottom: S.sm }}>{err}</Txt> : null}
              <Button title="Create Project" onPress={create} loading={saving} testID="create-project-button" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  track: { height: 5, borderRadius: 3, backgroundColor: C.surface3, marginTop: S.md, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3, backgroundColor: C.ink },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: S.lg },
  chip: { height: 36, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
