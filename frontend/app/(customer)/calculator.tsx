/**
 * <screen route="/(customer)/calculator" name="KitchenCalculator" role="customer">
 *   <purpose>
 *     Faithful clone of interiojunction.in's "Kitchen Calculator": a 3-step
 *     estimator (Layout → Dimensions → Finish & Add-ons) with a live, clearly
 *     INDICATIVE ₹ estimate panel. Funnels to "Book Free 3D Design" (lead) and
 *     "WhatsApp Us" — the real quote always follows a free 3D design session.
 *   </purpose>
 *   <config>All layouts/finishes/add-ons/rates live in src/brand.ts.</config>
 *   <sections>step-indicator · step1-layout · step2-dimensions · step3-finish · estimate-panel</sections>
 * </screen>
 */
import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Txt, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { LeadSheet } from "@/src/components/LeadSheet";
import {
  KITCHEN_LAYOUTS, KITCHEN_FINISHES, KITCHEN_ADDONS,
  estimateKitchen, inr, waUrl, telUrl, BRAND,
} from "@/src/brand";
import { C, S, R, FS } from "@/src/theme";

const RFT_PRESETS = [8, 10, 12, 15, 18];

export default function KitchenCalculator() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [layout, setLayout] = useState<string | null>(null);
  const [rft, setRft] = useState<number | null>(null);
  const [finish, setFinish] = useState("Membrane");
  const [addons, setAddons] = useState<string[]>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const finishRate = KITCHEN_FINISHES.find((f) => f.key === finish)?.ratePerRft ?? 0;
  const addonTotal = useMemo(
    () => addons.reduce((s, a) => s + (KITCHEN_ADDONS.find((x) => x.key === a)?.price ?? 0), 0),
    [addons],
  );
  const effectiveRft = rft ?? (layout ? KITCHEN_LAYOUTS.find((l) => l.key === layout)?.baseRft ?? 0 : 0);
  const estimate = estimateKitchen(effectiveRft, finishRate, addonTotal);

  const toggleAddon = (k: string) =>
    setAddons((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const waText =
    `Hi Interiojunction! My kitchen estimate: ${layout || "—"}, ${effectiveRft || "—"} rft, ` +
    `${finish} finish${addons.length ? `, add-ons: ${addons.join(", ")}` : ""}. ` +
    `Indicative ${inr(estimate)}. I'd like to book a free 3D design.`;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Kitchen Calculator" subtitle="Instant Estimate" />

      {/* <section id="step-indicator" /> */}
      <View style={styles.steps}>
        {[1, 2, 3].map((n, i) => (
          <React.Fragment key={n}>
            <View style={[styles.stepDot, step >= n ? styles.stepOn : styles.stepOff]}>
              <Txt weight="bold" size={FS.sm} color={step >= n ? C.onBrand : C.inkMute}>{n}</Txt>
            </View>
            {i < 2 && <View style={[styles.stepLine, step > n && { backgroundColor: C.brand }]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* <section id="step1-layout" /> */}
        {step === 1 && (
          <>
            <Txt size={FS.sm} weight="bold" color={C.brand} style={{ letterSpacing: 1 }}>STEP ONE</Txt>
            <Txt display size={FS.xxxl} style={{ marginTop: S.xs, marginBottom: S.xs }}>Choose your kitchen layout</Txt>
            <Txt color={C.inkSoft} style={{ marginBottom: S.lg }}>
              Your layout determines the total running feet of cabinets. Select the one that best matches your kitchen shape.
            </Txt>
            {KITCHEN_LAYOUTS.map((l) => {
              const on = layout === l.key;
              return (
                <Pressable key={l.key} testID={`layout-${l.key}`} onPress={() => setLayout(l.key)}
                  style={[styles.card, on && styles.cardOn]}>
                  <View style={styles.layoutIcon}><Feather name="grid" size={26} color={on ? C.brand : C.inkMute} /></View>
                  <Txt display size={FS.xxl} style={{ textAlign: "center" }}>{l.key}</Txt>
                  <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: 4, maxWidth: 280 }}>{l.desc}</Txt>
                  <View style={styles.tag}><Txt size={FS.sm} weight="bold" color={C.onBrandSoft}>{l.tag}</Txt></View>
                </Pressable>
              );
            })}
            <Button title="Next: Dimensions  →" onPress={() => setStep(2)} disabled={!layout}
              style={{ marginTop: S.md }} testID="calc-next-1" />
          </>
        )}

        {/* <section id="step2-dimensions" /> */}
        {step === 2 && (
          <>
            <Txt size={FS.sm} weight="bold" color={C.brand} style={{ letterSpacing: 1 }}>STEP TWO</Txt>
            <Txt display size={FS.xxxl} style={{ marginTop: S.xs, marginBottom: S.xs }}>Kitchen dimensions</Txt>
            <Txt color={C.inkSoft} style={{ marginBottom: S.lg }}>
              Total running feet (rft) of cabinets — the length of your counters. Not sure? Pick the closest.
            </Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg }}>
              {RFT_PRESETS.map((p) => (
                <Pressable key={p} testID={`rft-${p}`} onPress={() => setRft(p)}
                  style={[styles.rftChip, rft === p && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Txt weight="medium" color={rft === p ? C.onBrand : C.inkSoft}>{p} rft</Txt>
                </Pressable>
              ))}
            </View>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>OR ENTER EXACTLY</Txt>
            <View style={styles.rftInputWrap}>
              <TextInput testID="rft-input" keyboardType="number-pad" placeholder="e.g. 11"
                placeholderTextColor={C.inkMute} value={rft ? String(rft) : ""}
                onChangeText={(t) => setRft(t ? Math.max(0, parseInt(t.replace(/[^0-9]/g, ""), 10) || 0) : null)}
                style={styles.rftInput} />
              <Txt color={C.inkMute}>running feet</Txt>
            </View>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.xl }}>
              <Button title="←  Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }} testID="calc-back-2" />
              <Button title="Next: Finish  →" onPress={() => setStep(3)} disabled={!effectiveRft} style={{ flex: 1.4 }} testID="calc-next-2" />
            </View>
          </>
        )}

        {/* <section id="step3-finish" /> */}
        {step === 3 && (
          <>
            <Txt size={FS.sm} weight="bold" color={C.brand} style={{ letterSpacing: 1 }}>STEP THREE</Txt>
            <Txt display size={FS.xxxl} style={{ marginTop: S.xs, marginBottom: S.lg }}>Finish & add-ons</Txt>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>SHUTTER FINISH</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg }}>
              {KITCHEN_FINISHES.map((f) => (
                <Pressable key={f.key} testID={`finish-${f.key}`} onPress={() => setFinish(f.key)}
                  style={[styles.rftChip, finish === f.key && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Txt weight="medium" color={finish === f.key ? C.onBrand : C.inkSoft}>{f.key}</Txt>
                </Pressable>
              ))}
            </View>
            <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>ADD-ONS (OPTIONAL)</Txt>
            <View style={{ gap: S.sm, marginBottom: S.lg }}>
              {KITCHEN_ADDONS.map((a) => {
                const on = addons.includes(a.key);
                return (
                  <Pressable key={a.key} testID={`addon-${a.key}`} onPress={() => toggleAddon(a.key)}
                    style={[styles.addonRow, on && { borderColor: C.brand, backgroundColor: C.brandSoft }]}>
                    <Feather name={on ? "check-square" : "square"} size={18} color={on ? C.brand : C.inkMute} />
                    <Txt weight="medium" style={{ flex: 1, marginLeft: S.sm }}>{a.key}</Txt>
                    <Txt color={C.inkMute}>+{inr(a.price)}</Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button title="←  Back" variant="outline" onPress={() => setStep(2)} testID="calc-back-3" />
          </>
        )}

        {/* <section id="estimate-panel" /> */}
        <View style={styles.estimate}>
          <Txt size={FS.sm} weight="medium" color="rgba(253,250,246,0.6)" style={{ letterSpacing: 1.5 }}>ESTIMATED PRICE</Txt>
          <Txt display size={40} color={C.onInverse} style={{ marginTop: S.xs }}>
            {estimate ? inr(estimate) : "₹—"}
          </Txt>
          {!estimate && (
            <Txt color="rgba(253,250,246,0.55)" style={{ marginTop: S.xs }}>Select layout & dimensions to see estimate</Txt>
          )}
          <View style={styles.estDivider} />
          {[
            ["Layout", layout || "—"],
            ["Running Feet", effectiveRft ? `${effectiveRft} rft` : "—"],
            ["Finish", finish],
            ["Add-ons", addons.length ? `${addons.length} selected` : "None"],
          ].map(([k, v]) => (
            <View key={k} style={styles.estRow}>
              <Txt color="rgba(253,250,246,0.7)">{k}</Txt>
              <Txt weight="medium" color={C.onInverse}>{v}</Txt>
            </View>
          ))}
          <Txt size={FS.sm} color="rgba(253,250,246,0.5)" style={{ marginTop: S.md, lineHeight: 18 }}>
            *{BRAND.pricingNote}
          </Txt>
          <Button title="Book Free 3D Design" icon="box" onPress={() => setQuoteOpen(true)}
            style={{ marginTop: S.lg }} testID="calc-book-3d" />
          <Button title="WhatsApp Us" variant="outline" icon="message-circle"
            onPress={() => Linking.openURL(waUrl(waText)).catch(() => Linking.openURL(telUrl()))}
            style={{ marginTop: S.sm, borderColor: "rgba(253,250,246,0.4)" }} testID="calc-whatsapp" />
        </View>
      </ScrollView>

      <LeadSheet visible={quoteOpen} mode="quote" onClose={() => setQuoteOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.md, backgroundColor: C.surface3 },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepOn: { backgroundColor: C.brand },
  stepOff: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.borderStrong },
  stepLine: { flex: 1, height: 2, backgroundColor: C.borderStrong, marginHorizontal: S.sm },
  card: { backgroundColor: C.surface3, borderWidth: 1.5, borderColor: "transparent", borderRadius: R.lg, padding: S.xl, alignItems: "center", marginBottom: S.md },
  cardOn: { borderColor: C.brand, backgroundColor: C.brandSoft },
  layoutIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  tag: { marginTop: S.md, backgroundColor: C.surface2, paddingHorizontal: S.md, height: 28, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  rftChip: { height: 44, paddingHorizontal: S.lg, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  rftInputWrap: { flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 54 },
  rftInput: { flex: 1, fontFamily: "DMSans", fontSize: FS.xl, color: C.ink },
  addonRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.lg },
  estimate: { backgroundColor: C.inverse, borderRadius: R.lg, padding: S.xl, marginTop: S.xl },
  estDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(253,250,246,0.2)", marginVertical: S.lg },
  estRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: S.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(253,250,246,0.12)" },
});
