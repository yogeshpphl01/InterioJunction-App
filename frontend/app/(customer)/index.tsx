import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Txt, Card, Loading, Empty, StatusPill } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { stageLabel } from "@/src/constants";
import { C, S, R, FS, shadow } from "@/src/theme";

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<any[]>("/projects");
      setProjects(res);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="My Projects" subtitle={`Hello, ${user?.name?.split(" ")[0] || "there"}`} />
      {loading ? <Loading /> : (
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
          showsVerticalScrollIndicator={false}
        >
          <Pressable testID="ai-promo" onPress={() => router.push("/(customer)/assistant")} style={styles.aiCard}>
            <View style={styles.aiIcon}><Feather name="zap" size={18} color={C.onBrand} /></View>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={FS.lg} color={C.onInverse}>Design Assistant</Txt>
              <Txt size={FS.sm} color="rgba(253,250,246,0.8)">Get ideas & a free quote in seconds</Txt>
            </View>
            <Feather name="arrow-right" size={20} color={C.onInverse} />
          </Pressable>

          <Pressable testID="start-project-card" onPress={() => router.push("/(customer)/start-project")} style={styles.startCard}>
            <View style={styles.startIcon}><Feather name="credit-card" size={18} color={C.ink} /></View>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={FS.lg}>Start Your Project</Txt>
              <Txt size={FS.sm} color={C.inkMute}>Book your slot with a 10% booking payment</Txt>
            </View>
            <Feather name="arrow-right" size={20} color={C.ink} />
          </Pressable>

          {projects.length === 0 ? (
            <Empty icon="layout" title="No active projects yet"
              subtitle="Chat with our AI Design Assistant to get a free quote and start your interior journey." />
          ) : (
            projects.map((p) => (
              <Pressable key={p.id} testID={`project-card-${p.project_code}`} onPress={() => router.push(`/project/${p.project_code}`)} style={styles.projCard}>
                <View style={styles.projHero}>
                  <Image source={{ uri: p.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                  <LinearGradient colors={["transparent", "rgba(26,26,26,0.9)"]} style={StyleSheet.absoluteFill} />
                  <View style={styles.projHeroBody}>
                    <StatusPill label={stageLabel(p.current_stage)} bg={C.onInverse} fg={C.ink} />
                  </View>
                </View>
                <View style={{ padding: S.lg }}>
                  <Txt size={FS.sm} weight="medium" color={C.inkMute} style={{ letterSpacing: 0.5 }}>{p.category.toUpperCase()}</Txt>
                  <Txt display size={FS.xl} style={{ marginTop: 2 }} numberOfLines={1}>{p.title}</Txt>
                  <View style={styles.track}><View style={[styles.fill, { width: `${p.progress}%` }]} /></View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Txt size={FS.sm} color={C.inkMute}>{p.project_code}</Txt>
                    <Txt size={FS.sm} weight="medium" color={C.success}>{p.progress}% complete</Txt>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  aiCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.inverse, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, ...shadow },
  aiIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(253,250,246,0.15)", alignItems: "center", justifyContent: "center", marginRight: S.md },
  startCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.xl, ...shadow },
  startIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.tint, alignItems: "center", justifyContent: "center", marginRight: S.md },
  projCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.lg, ...shadow },
  projHero: { height: 150, justifyContent: "flex-end" },
  projHeroBody: { padding: S.md, alignItems: "flex-start" },
  track: { height: 6, borderRadius: 3, backgroundColor: C.surface3, marginTop: S.md, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.ink },
});
