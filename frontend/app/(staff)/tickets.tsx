/**
 * <screen route="/(staff)/tickets" name="StaffTickets" role="admin|sales|factory">
 *   <purpose>Support queue — filter by status; optimistic status changes
 *     (resolve/close/reopen) via PATCH /tickets/{id}.</purpose>
 *   <data>GET /tickets · PATCH /tickets/{id}</data>
 *   <sections>filter-chips · ticket-list (with inline status actions)</sections>
 * </screen>
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Loading, Empty, StatusPill, Chip } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { statusColor } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

const FILTERS = ["all", "open", "resolved", "closed"];

export default function StaffTickets() {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try { setTickets(await api<any[]>("/tickets")); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    try { await api(`/tickets/${id}`, { method: "PATCH", body: { status } }); } catch { load(); }
  };

  const shown = tickets.filter((t) => filter === "all" || t.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Tickets" subtitle="Support Queue" />
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.xl }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} testID={`filter-${f}`} />
          ))}
        </ScrollView>
      </View>
      {loading ? <Loading /> : (
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingTop: S.md, paddingBottom: insets.bottom + S.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.ink} />}
          showsVerticalScrollIndicator={false}
        >
          {shown.length === 0 ? (
            <Empty icon="inbox" title="No tickets" subtitle="Tickets raised by customers appear here." />
          ) : shown.map((t) => {
            const sc = statusColor(t.status);
            return (
              <Card key={t.id} style={{ marginBottom: S.md }} testID={`staff-ticket-${t.ticket_no}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium" numberOfLines={1}>{t.subject}</Txt>
                    <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 2 }}>{t.ticket_no} · {t.customer_name} · {t.type}</Txt>
                  </View>
                  <StatusPill label={t.status} bg={sc.bg} fg={sc.fg} />
                </View>
                {t.description ? <Txt size={FS.sm} color={C.inkSoft} style={{ marginTop: S.sm }}>{t.description}</Txt> : null}
                <View style={styles.actions}>
                  {t.status !== "resolved" && (
                    <Pressable testID={`resolve-${t.ticket_no}`} onPress={() => setStatus(t.id, "resolved")} style={styles.actBtn}>
                      <Feather name="check" size={14} color={C.success} />
                      <Txt size={FS.sm} weight="medium" color={C.success} style={{ marginLeft: 4 }}>Resolve</Txt>
                    </Pressable>
                  )}
                  {t.status !== "closed" && (
                    <Pressable onPress={() => setStatus(t.id, "closed")} style={styles.actBtn}>
                      <Feather name="x" size={14} color={C.inkSoft} />
                      <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginLeft: 4 }}>Close</Txt>
                    </Pressable>
                  )}
                  {t.status !== "open" && (
                    <Pressable onPress={() => setStatus(t.id, "open")} style={styles.actBtn}>
                      <Feather name="rotate-ccw" size={14} color={C.inkSoft} />
                      <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginLeft: 4 }}>Reopen</Txt>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingVertical: S.md, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  actions: { flexDirection: "row", gap: S.lg, marginTop: S.md, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  actBtn: { flexDirection: "row", alignItems: "center" },
});
