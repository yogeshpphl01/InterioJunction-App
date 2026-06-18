/**
 * <screen route="/(customer)" name="CustomerHome" role="customer">
 *   <purpose>
 *     The customer landing screen. Mirrors interiojunction.in's homepage intent:
 *     brand hero + services showcase + the two primary conversion actions
 *     ("Get a Free Quote", "Request a Callback") + the customer's own project
 *     tracking cards.
 *   </purpose>
 *   <data>GET /projects (object-scoped to this customer)</data>
 *   <sections>ai-promo · lead-cta · services · projects</sections>
 *   <navigation>Tap a project → /project/[code]; AI promo → /(customer)/assistant</navigation>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Txt, Loading, Empty, StatusPill, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { LeadSheet, LeadMode } from "@/src/components/LeadSheet";
import { stageLabel } from "@/src/constants";
import { C, S, R, FS, shadow } from "@/src/theme";

// Services offered (matches interiojunction.in + backend seed categories).
const SERVICES = [
  { title: "Modular Kitchen", img: "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" },
  { title: "Modular Wardrobe", img: "https://images.unsplash.com/photo-1708397016786-8916880649b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" },
  { title: "Full Home Interior", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" },
];

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadMode, setLeadMode] = useState<LeadMode | null>(null); // which lead sheet is open

  const load = useCallback(async () => {
    try {
      const res = await api<any[]>("/projects");
      setProjects(res);
    } catch { /* ignore — offline/empty handled by UI */ }
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
          {/* <section id="ai-promo" purpose="Entry to AI design/quote assistant" /> */}
          <Pressable testID="ai-promo" onPress={() => router.push("/(customer)/assistant")} style={styles.aiCard}>
            <View style={styles.aiIcon}><Feather name="zap" size={18} color={C.onBrand} /></View>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={FS.lg} color={C.onInverse}>Design Assistant</Txt>
              <Txt size={FS.sm} color="rgba(253,250,246,0.8)">Get ideas & a free quote in seconds</Txt>
            </View>
            <Feather name="arrow-right" size={20} color={C.onInverse} />
          </Pressable>

          {/* <section id="lead-cta" purpose="Website-parity Quote + Callback actions" /> */}
          <View style={styles.ctaRow}>
            <Button title="Get a Free Quote" icon="file-text" onPress={() => setLeadMode("quote")}
              style={{ flex: 1 }} testID="cta-quote" />
            <Button title="Callback" icon="phone-call" variant="outline" onPress={() => setLeadMode("callback")}
              style={{ flex: 1 }} testID="cta-callback" />
          </View>

          {/* <section id="services" purpose="Service showcase carousel (kitchen/wardrobe/full home)" /> */}
          <Txt display size={FS.xl} style={{ marginTop: S.xl, marginBottom: S.md }}>What we do</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.xl }}>
            {SERVICES.map((s) => (
              <Pressable key={s.title} testID={`service-${s.title}`} onPress={() => setLeadMode("quote")} style={styles.serviceCard}>
                <Image source={{ uri: s.img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <LinearGradient colors={["transparent", "rgba(26,26,26,0.92)"]} style={StyleSheet.absoluteFill} />
                <Txt weight="medium" color={C.onInverse} style={styles.serviceLabel}>{s.title}</Txt>
              </Pressable>
            ))}
          </ScrollView>

          {/* <section id="projects" purpose="Customer's own project tracking cards" /> */}
          <Txt display size={FS.xl} style={{ marginTop: S.xl, marginBottom: S.md }}>Your projects</Txt>
          {projects.length === 0 ? (
            <Empty icon="layout" title="No active projects yet"
              subtitle="Get a free quote or chat with our AI Design Assistant to start your interior journey." />
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

      {/* <section id="lead-sheet" purpose="Quote/Callback capture modal" /> */}
      <LeadSheet visible={leadMode !== null} mode={leadMode ?? "quote"} onClose={() => setLeadMode(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  aiCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.inverse, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg, ...shadow },
  aiIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(253,250,246,0.15)", alignItems: "center", justifyContent: "center", marginRight: S.md },
  ctaRow: { flexDirection: "row", gap: S.md },
  serviceCard: { width: 150, height: 190, borderRadius: R.lg, overflow: "hidden", justifyContent: "flex-end", ...shadow },
  serviceLabel: { padding: S.md },
  projCard: { backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.lg, ...shadow },
  projHero: { height: 150, justifyContent: "flex-end" },
  projHeroBody: { padding: S.md, alignItems: "flex-start" },
  track: { height: 6, borderRadius: 3, backgroundColor: C.surface3, marginTop: S.md, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.ink },
});
