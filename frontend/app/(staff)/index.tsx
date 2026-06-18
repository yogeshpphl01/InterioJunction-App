/**
 * <screen route="/(staff)" name="StaffDashboard" role="admin|sales|factory">
 *   <purpose>KPI cards (projects/tickets/leads/scans) + active projects list.</purpose>
 *   <data>GET /dashboard · GET /projects (loaded in parallel)</data>
 *   <sections>kpi-grid · active-projects</sections>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Txt, Card, Loading, StatusPill } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { stageLabel } from "@/src/constants";
import { C, S, R, FS, shadow } from "@/src/theme";

export default function StaffDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api("/dashboard"), api<any[]>("/projects")]);
      setStats(s); setProjects(p);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = stats ? [
    { label: "Active Projects", value: stats.projects, icon: "grid", to: "/(staff)/projects" },
    { label: "Open Tickets", value: stats.open_tickets, icon: "inbox", to: "/(staff)/tickets" },
    { label: "New Leads", value: stats.new_leads, icon: "users", to: "/(staff)/leads" },
    { label: "Scans Today", value: stats.scans_today, icon: "activity", to: "/(staff)/projects" },
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Operations" subtitle={`Welcome, ${user?.name?.split(" ")[0]}`} />
      {loading ? <Loading /> : (
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {cards.map((c) => (
              <Pressable key={c.label} testID={`stat-${c.icon}`} onPress={() => router.push(c.to as any)} style={styles.statCard}>
                <View style={styles.statIcon}><Feather name={c.icon as any} size={16} color={C.onBrand} /></View>
                <Txt display size={32} style={{ marginTop: S.md }}>{c.value}</Txt>
                <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 2 }}>{c.label}</Txt>
              </Pressable>
            ))}
          </View>

          <Txt display size={FS.xl} style={{ marginTop: S.xl, marginBottom: S.md }}>Active Projects</Txt>
          {projects.slice(0, 6).map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/project/${p.project_code}`)}>
              <Card style={{ marginBottom: S.md }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium" numberOfLines={1}>{p.title}</Txt>
                    <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 2 }}>{p.project_code} · {p.customer_name}</Txt>
                  </View>
                  <StatusPill label={stageLabel(p.current_stage)} bg={C.tint} fg={C.ink} />
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md },
  statCard: { width: "47.5%", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, ...shadow },
  statIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
});
