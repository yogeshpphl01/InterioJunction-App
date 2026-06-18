/**
 * <screen route="/project/[code]" name="ProjectDetail" role="any (object-scoped)">
 *   <purpose>
 *     Single project view: hero, production timeline, parts breakdown by stage,
 *     and any service tickets. Backend enforces customer object-scoping (404 on
 *     cross-customer access).
 *   </purpose>
 *   <data>GET /projects/{code}</data>
 *   <sections>hero · production-timeline · parts-breakdown · service-tickets</sections>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Loading, StatusPill } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import StageTimeline from "@/src/components/StageTimeline";
import { stageLabel, statusColor } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

export default function ProjectDetail() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api(`/projects/${code}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }}><Header title="Project" onBack={() => router.back()} /><Loading /></View>;
  if (!data) return <View style={{ flex: 1, backgroundColor: C.surface }}><Header title="Project" onBack={() => router.back()} /><Txt style={{ padding: S.xl }}>Project not found.</Txt></View>;

  const p = data.project;
  const sc = statusColor(p.current_stage);
  const partGroups = data.parts.reduce((acc: Record<string, number>, pt: any) => {
    acc[pt.current_stage] = (acc[pt.current_stage] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title={p.title} subtitle={p.project_code} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + S.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={{ uri: p.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["transparent", "rgba(26,26,26,0.92)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <StatusPill label={stageLabel(p.current_stage)} bg={C.onInverse} fg={C.ink} />
            <Txt display size={26} color={C.onInverse} style={{ marginTop: S.sm }}>{p.category}</Txt>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${p.progress}%` }]} />
            </View>
            <Txt size={FS.sm} color="rgba(253,250,246,0.9)" style={{ marginTop: 6 }}>
              {p.progress}% complete · {p.parts_count} parts
            </Txt>
          </View>
        </View>

        <View style={{ padding: S.xl }}>
          <Txt display size={FS.xl} style={{ marginBottom: S.lg }}>Production Timeline</Txt>
          <Card>
            <StageTimeline current={p.current_stage} />
          </Card>

          <Txt display size={FS.xl} style={{ marginTop: S.xl, marginBottom: S.lg }}>Parts Breakdown</Txt>
          <Card>
            {Object.entries(partGroups).map(([stage, count], i, arr) => (
              <View key={stage} style={[styles.partRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.partDot}><Feather name="box" size={14} color={C.inkSoft} /></View>
                <Txt weight="medium" style={{ flex: 1 }}>{stageLabel(stage)}</Txt>
                <Txt color={C.inkMute}>{count as number} {(count as number) > 1 ? "parts" : "part"}</Txt>
              </View>
            ))}
          </Card>

          {data.tickets?.length > 0 && (
            <>
              <Txt display size={FS.xl} style={{ marginTop: S.xl, marginBottom: S.lg }}>Service Tickets</Txt>
              {data.tickets.map((t: any) => {
                const tc = statusColor(t.status);
                return (
                  <Card key={t.id} style={{ marginBottom: S.md }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Txt weight="medium" style={{ flex: 1 }}>{t.subject}</Txt>
                      <StatusPill label={t.status} bg={tc.bg} fg={tc.fg} />
                    </View>
                    <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 4 }}>{t.ticket_no} · {t.type}</Txt>
                  </Card>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 240, justifyContent: "flex-end" },
  heroBody: { padding: S.xl },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", marginTop: S.lg, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.onInverse },
  partRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, borderBottomColor: C.divider, borderBottomWidth: StyleSheet.hairlineWidth },
  partDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginRight: S.md },
});
