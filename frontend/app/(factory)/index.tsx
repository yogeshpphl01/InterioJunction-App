/**
 * <screen route="/(factory)" name="Scanner" role="factory">
 *   <purpose>
 *     Scan QR part labels (expo-camera) or type a code to advance a part to the
 *     next production stage. Includes a debounce/cooldown to prevent double
 *     advances, plus a recent-scans feed.
 *   </purpose>
 *   <data>POST /scan · GET /scan/recent</data>
 *   <sections>camera/permission-gate · manual-entry · recent-scans</sections>
 *   <perf>No glassmorphism here (per design guidelines) — scan-first performance.</perf>
 * </screen>
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, StyleSheet, Pressable, ScrollView, Linking, TextInput, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { Txt, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { stageLabel } from "@/src/constants";
import { C, S, R, FS } from "@/src/theme";

export default function Scanner() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [recent, setRecent] = useState<any[]>([]);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const cooldown = useRef(false);

  const loadRecent = useCallback(async () => {
    try { setRecent(await api<any[]>("/scan/recent")); } catch {}
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const handleScan = useCallback(async (code: string) => {
    if (cooldown.current) return;
    cooldown.current = true;
    try {
      const res = await api<any>("/scan", { method: "POST", body: { part_code: code.trim() } });
      const ok = !res.duplicate && !res.done;
      Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      setResult({ ok, text: res.message });
      loadRecent();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResult({ ok: false, text: e.message });
    } finally {
      setTimeout(() => { cooldown.current = false; setResult(null); }, 2500);
    }
  }, [loadRecent]);

  const askPermission = async () => {
    const res = await requestPermission();
    if (!res.granted && !res.canAskAgain) Linking.openSettings();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Part Scanner" subtitle="Factory Floor"
        right={
          <Pressable onPress={() => setShowManual((s) => !s)} style={styles.iconBtn} testID="manual-toggle">
            <Feather name="edit-3" size={18} color={C.ink} />
          </Pressable>
        }
      />

      <View style={styles.camWrap}>
        {permission?.granted ? (
          <>
            {isFocused && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39"] }}
                onBarcodeScanned={({ data }) => handleScan(data)}
              />
            )}
            <View style={styles.frame} pointerEvents="none">
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            {result && (
              <View style={[styles.toast, { backgroundColor: result.ok ? C.success : C.error }]} testID="scan-result">
                <Feather name={result.ok ? "check-circle" : "alert-circle"} size={18} color="#fff" />
                <Txt color="#fff" weight="medium" style={{ marginLeft: S.sm, flex: 1 }}>{result.text}</Txt>
              </View>
            )}
            <Txt color="rgba(255,255,255,0.85)" size={FS.sm} style={styles.hint}>Point at a part QR label</Txt>
          </>
        ) : (
          <View style={styles.permission}>
            <Feather name="camera-off" size={30} color={C.onInverse} />
            <Txt color={C.onInverse} weight="medium" size={FS.lg} style={{ marginTop: S.md, textAlign: "center" }}>
              Camera access needed
            </Txt>
            <Txt color="rgba(253,250,246,0.7)" style={{ marginTop: S.sm, textAlign: "center", maxWidth: 260 }}>
              Allow the camera to scan QR labels on furniture parts.
            </Txt>
            <Pressable onPress={askPermission} style={styles.permBtn} testID="grant-camera-button">
              <Txt color={C.ink} weight="medium">{permission?.canAskAgain === false ? "Open Settings" : "Enable Camera"}</Txt>
            </Pressable>
          </View>
        )}
      </View>

      {showManual && (
        <View style={styles.manualRow}>
          <TextInput
            testID="manual-part-input"
            placeholder="Enter part code e.g. PRJ-2026-041-P001"
            placeholderTextColor={C.inkMute}
            autoCapitalize="characters"
            value={manual}
            onChangeText={setManual}
            style={styles.manualInput}
          />
          <Pressable
            testID="manual-scan-button"
            onPress={() => { if (manual.trim()) { cooldown.current = false; handleScan(manual); setManual(""); } }}
            style={styles.manualBtn}
          >
            <Feather name="arrow-right" size={20} color={C.onBrand} />
          </Pressable>
        </View>
      )}

      <View style={styles.recentHead}>
        <Txt display size={FS.lg}>Recent Scans</Txt>
        <Pressable onPress={loadRecent}><Feather name="refresh-cw" size={16} color={C.inkMute} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: insets.bottom + S.xxl }} showsVerticalScrollIndicator={false}>
        {recent.length === 0 ? (
          <Txt color={C.inkMute} style={{ paddingVertical: S.lg }}>No scans yet today.</Txt>
        ) : recent.map((e) => (
          <View key={e.id} style={styles.scanRow}>
            <View style={styles.scanDot}><Feather name="check" size={14} color={C.success} /></View>
            <View style={{ flex: 1 }}>
              <Txt weight="medium" size={FS.base}>{e.part_code}</Txt>
              <Txt size={FS.sm} color={C.inkMute}>{e.project_code}</Txt>
            </View>
            <View style={styles.stageTag}><Txt size={FS.sm} weight="medium" color={C.ink}>{e.stage_label}</Txt></View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  camWrap: { height: 320, backgroundColor: C.inverse, margin: S.lg, borderRadius: R.lg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  frame: { width: 200, height: 200 },
  corner: { position: "absolute", width: 32, height: 32, borderColor: "#fff" },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  hint: { position: "absolute", bottom: S.lg },
  toast: { position: "absolute", top: S.lg, left: S.lg, right: S.lg, flexDirection: "row", alignItems: "center", padding: S.md, borderRadius: R.md },
  permission: { alignItems: "center", padding: S.xl },
  permBtn: { marginTop: S.lg, backgroundColor: C.onInverse, paddingHorizontal: S.xl, height: 46, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  manualRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, marginBottom: S.md, gap: S.sm },
  manualInput: { flex: 1, height: 48, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, fontFamily: "DMSans", fontSize: FS.base, color: C.ink },
  manualBtn: { width: 48, height: 48, borderRadius: R.md, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  recentHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.md },
  scanRow: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  scanDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#DCEAE2", alignItems: "center", justifyContent: "center", marginRight: S.md },
  stageTag: { backgroundColor: C.tint, paddingHorizontal: S.md, height: 26, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
});
