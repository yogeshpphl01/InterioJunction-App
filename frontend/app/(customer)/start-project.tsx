import React, { useMemo, useState } from "react";
import {
  View, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Card, Button } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { C, S, R, FS, shadow } from "@/src/theme";

const BOOKING_PCT = 10;

type Pkg = { category: string; tagline: string; from: number; icon: keyof typeof Feather.glyphMap; hero: string };

const PACKAGES: Pkg[] = [
  {
    category: "Modular Kitchen",
    tagline: "Greenlam MFC HMR boards · Hettich hardware · 10-yr warranty",
    from: 180000,
    icon: "coffee",
    hero: "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  },
  {
    category: "Modular Wardrobe",
    tagline: "Sliding or hinged · soft-close · custom internal storage",
    from: 85000,
    icon: "archive",
    hero: "https://images.unsplash.com/photo-1708397016786-8916880649b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  },
  {
    category: "Full Home Interior",
    tagline: "End-to-end design + factory-made interiors for your whole home",
    from: 650000,
    icon: "home",
    hero: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  },
];

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

type Step = "select" | "review" | "pay" | "processing" | "done";

export default function StartProject() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("select");
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [totalStr, setTotalStr] = useState("");

  // Mock card fields
  const [cardName, setCardName] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");

  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any>(null);

  const total = useMemo(() => {
    const n = parseInt(totalStr.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }, [totalStr]);
  const booking = useMemo(() => Math.round((total * BOOKING_PCT) / 100), [total]);

  const choosePackage = (p: Pkg) => {
    setPkg(p);
    if (!totalStr) setTotalStr(String(p.from));
  };

  const goReview = () => {
    if (!pkg) { setError("Please choose a project type"); return; }
    if (total < 10000) { setError("Enter your estimated project cost (min ₹10,000)"); return; }
    setError(""); setStep("review");
  };

  const formatCardNo = (v: string) =>
    v.replace(/[^0-9]/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExp = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const pay = async () => {
    if (cardName.trim().length < 2) { setError("Enter the name on card"); return; }
    if (cardNo.replace(/\s/g, "").length < 16) { setError("Enter a valid 16-digit card number"); return; }
    if (exp.length < 5) { setError("Enter card expiry (MM/YY)"); return; }
    if (cvv.length < 3) { setError("Enter the 3-digit CVV"); return; }
    setError(""); setStep("processing");
    try {
      const res = await api("/payments", {
        method: "POST",
        body: { category: pkg!.category, total_amount: total, method: "card" },
      });
      // brief processing animation for realism
      setTimeout(() => { setReceipt(res); setStep("done"); }, 1400);
    } catch (e: any) {
      setError(e.message || "Payment failed. Please try again.");
      setStep("pay");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header
        title="Start Your Project"
        subtitle={`Pay ${BOOKING_PCT}% to begin`}
        onBack={step === "select" || step === "done" ? () => router.back() : () => setStep(step === "pay" ? "review" : "select")}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "select" && (
            <>
              <Txt display size={FS.xxl} style={{ marginBottom: S.xs }}>Book your interiors</Txt>
              <Txt color={C.inkMute} style={{ marginBottom: S.xl }}>
                Reserve your production slot with a {BOOKING_PCT}% booking amount. It is fully adjusted into your final invoice.
              </Txt>

              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>CHOOSE PROJECT TYPE</Txt>
              <View style={{ gap: S.md, marginBottom: S.xl }}>
                {PACKAGES.map((p) => {
                  const active = pkg?.category === p.category;
                  return (
                    <Pressable key={p.category} testID={`pkg-${p.category}`} onPress={() => choosePackage(p)}
                      style={[styles.pkg, active && { borderColor: C.ink, borderWidth: 2 }]}>
                      <View style={styles.pkgIcon}><Feather name={p.icon} size={18} color={C.onBrand} /></View>
                      <View style={{ flex: 1 }}>
                        <Txt weight="bold" size={FS.lg}>{p.category}</Txt>
                        <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: 2 }}>{p.tagline}</Txt>
                        <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginTop: 6 }}>Starts at {inr(p.from)}</Txt>
                      </View>
                      <Feather name={active ? "check-circle" : "circle"} size={20} color={active ? C.ink : C.borderStrong} />
                    </Pressable>
                  );
                })}
              </View>

              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>ESTIMATED PROJECT COST (₹)</Txt>
              <View style={styles.amountWrap}>
                <Txt size={FS.xl} weight="bold" color={C.inkMute} style={{ marginRight: 4 }}>₹</Txt>
                <TextInput
                  testID="total-input"
                  value={totalStr ? Number(total).toLocaleString("en-IN") : ""}
                  onChangeText={(t) => setTotalStr(t)}
                  keyboardType="number-pad"
                  placeholder="2,00,000"
                  placeholderTextColor={C.inkMute}
                  style={styles.amountInput}
                />
              </View>
              <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: S.sm }}>
                Not sure of the cost? Get a free estimate from our Design AI first.
              </Txt>

              {total > 0 && (
                <Card style={{ marginTop: S.lg, backgroundColor: C.tint, borderColor: C.tint }}>
                  <View style={styles.lineRow}>
                    <Txt color={C.inkSoft}>Booking amount ({BOOKING_PCT}%)</Txt>
                    <Txt display size={FS.xl}>{inr(booking)}</Txt>
                  </View>
                </Card>
              )}

              {error ? <Txt color={C.error} style={{ marginTop: S.md }}>{error}</Txt> : null}
              <View style={{ marginTop: S.xl }}>
                <Button title="Continue to Payment" icon="arrow-right" onPress={goReview} testID="continue-payment" />
              </View>
            </>
          )}

          {step === "review" && pkg && (
            <>
              <Txt display size={FS.xxl} style={{ marginBottom: S.lg }}>Review & confirm</Txt>
              <Card>
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Project type</Txt>
                  <Txt weight="medium">{pkg.category}</Txt>
                </View>
                <View style={styles.divider} />
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Estimated total</Txt>
                  <Txt weight="medium">{inr(total)}</Txt>
                </View>
                <View style={styles.divider} />
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Booking ({BOOKING_PCT}%)</Txt>
                  <Txt weight="medium">{inr(booking)}</Txt>
                </View>
                <View style={styles.divider} />
                <View style={styles.lineRow}>
                  <Txt weight="bold" size={FS.lg}>Pay now</Txt>
                  <Txt display size={FS.xxl}>{inr(booking)}</Txt>
                </View>
              </Card>
              <View style={styles.reassure}>
                <Feather name="shield" size={14} color={C.success} />
                <Txt size={FS.sm} color={C.inkSoft} style={{ marginLeft: 6, flex: 1 }}>
                  100% adjustable against your final invoice. Refundable if you cancel before production starts.
                </Txt>
              </View>
              <View style={{ marginTop: S.xl }}>
                <Button title={`Pay ${inr(booking)}`} icon="credit-card" onPress={() => setStep("pay")} testID="to-pay" />
              </View>
            </>
          )}

          {step === "pay" && pkg && (
            <>
              <View style={styles.gatewayBadge}>
                <Feather name="lock" size={13} color={C.success} />
                <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginLeft: 6 }}>Secure payment · Interiojunction Pay</Txt>
              </View>
              <Txt display size={FS.xxl} style={{ marginBottom: S.xs }}>{inr(booking)}</Txt>
              <Txt color={C.inkMute} style={{ marginBottom: S.lg }}>Booking for {pkg.category}</Txt>

              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>NAME ON CARD</Txt>
              <View style={styles.fieldWrap}>
                <Feather name="user" size={16} color={C.inkMute} style={{ marginRight: S.sm }} />
                <TextInput value={cardName} onChangeText={setCardName} placeholder="Full name"
                  placeholderTextColor={C.inkMute} style={styles.fieldInput} testID="card-name" />
              </View>

              <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginTop: S.lg, marginBottom: S.sm }}>CARD NUMBER</Txt>
              <View style={styles.fieldWrap}>
                <Feather name="credit-card" size={16} color={C.inkMute} style={{ marginRight: S.sm }} />
                <TextInput value={cardNo} onChangeText={(v) => setCardNo(formatCardNo(v))} placeholder="1234 5678 9012 3456"
                  placeholderTextColor={C.inkMute} keyboardType="number-pad" style={styles.fieldInput} testID="card-number" />
              </View>

              <View style={{ flexDirection: "row", gap: S.md, marginTop: S.lg }}>
                <View style={{ flex: 1 }}>
                  <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>EXPIRY</Txt>
                  <View style={styles.fieldWrap}>
                    <TextInput value={exp} onChangeText={(v) => setExp(formatExp(v))} placeholder="MM/YY"
                      placeholderTextColor={C.inkMute} keyboardType="number-pad" style={styles.fieldInput} testID="card-exp" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm }}>CVV</Txt>
                  <View style={styles.fieldWrap}>
                    <TextInput value={cvv} onChangeText={(v) => setCvv(v.replace(/[^0-9]/g, "").slice(0, 3))} placeholder="123"
                      placeholderTextColor={C.inkMute} keyboardType="number-pad" secureTextEntry style={styles.fieldInput} testID="card-cvv" />
                  </View>
                </View>
              </View>

              {error ? <Txt color={C.error} style={{ marginTop: S.md }}>{error}</Txt> : null}
              <View style={{ marginTop: S.xl }}>
                <Button title={`Pay ${inr(booking)}`} icon="lock" onPress={pay} testID="pay-now" />
              </View>
              <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: S.md }}>
                Demo gateway — no real card is charged.
              </Txt>
            </>
          )}

          {step === "processing" && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.ink} />
              <Txt display size={FS.xl} style={{ marginTop: S.lg }}>Processing payment…</Txt>
              <Txt color={C.inkMute} style={{ marginTop: S.sm }}>{"Please don't close this screen."}</Txt>
            </View>
          )}

          {step === "done" && receipt && (
            <View style={styles.center}>
              <View style={styles.successIcon}><Feather name="check" size={34} color={C.onBrand} /></View>
              <Txt display size={FS.xxl} style={{ marginTop: S.lg, textAlign: "center" }}>Payment successful</Txt>
              <Txt color={C.inkMute} style={{ marginTop: S.sm, textAlign: "center" }}>
                Your project is booked. Our design team will reach out within 24 hours to schedule your free site measurement.
              </Txt>
              <Card style={{ marginTop: S.xl, width: "100%" }}>
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Receipt</Txt>
                  <Txt weight="medium">{receipt.receipt_no}</Txt>
                </View>
                <View style={styles.divider} />
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Project type</Txt>
                  <Txt weight="medium">{receipt.category}</Txt>
                </View>
                <View style={styles.divider} />
                <View style={styles.lineRow}>
                  <Txt color={C.inkMute}>Amount paid</Txt>
                  <Txt weight="bold">{inr(receipt.amount)}</Txt>
                </View>
              </Card>
              <View style={{ marginTop: S.xl, width: "100%", gap: S.md }}>
                <Button title="Back to Home" icon="home" onPress={() => router.replace("/(customer)")} testID="payment-done" />
                <Button title="Chat with Design AI" variant="outline" icon="message-circle" onPress={() => router.replace("/(customer)/assistant")} />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pkg: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: S.md, ...shadow },
  pkgIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  amountWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 58 },
  amountInput: { flex: 1, fontFamily: "DMSans", fontSize: 22, color: C.ink, paddingVertical: 0 },
  lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: S.md },
  reassure: { flexDirection: "row", alignItems: "flex-start", marginTop: S.lg, paddingHorizontal: S.xs },
  gatewayBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: C.surface3, paddingHorizontal: S.md, height: 30, borderRadius: R.pill, marginBottom: S.lg },
  fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.lg, height: 52 },
  fieldInput: { flex: 1, fontFamily: "DMSans", fontSize: FS.lg, color: C.ink, paddingVertical: 0 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: S.xxxl },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
});
