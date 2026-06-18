/**
 * <component name="LeadSheet" surface="customer + public" brand="interiojunction.in">
 *   <purpose>
 *     Bottom-sheet lead-capture form replicating the two public actions on the
 *     Interiojunction website: "Get a Free Quote" and "Request a Callback".
 *     Posts to the UNAUTHENTICATED /public/quote and /public/callback endpoints
 *     so visitors can submit before creating an account (website parity); the
 *     lead lands directly in the staff CRM.
 *   </purpose>
 *   <props>
 *     visible : controls the modal
 *     mode    : "quote" | "callback" — switches fields, copy and endpoint
 *     onClose : dismiss handler
 *   </props>
 *   <states>idle form → submitting → success confirmation (auto-resets on close)</states>
 * </component>
 */
import React, { useState } from "react";
import {
  View, StyleSheet, Modal, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt, Button, Field } from "@/src/components/ui";
import { C, S, R, FS } from "@/src/theme";

export type LeadMode = "quote" | "callback";

// Service categories offered on interiojunction.in — keep in sync with backend seed.
const CATEGORIES = ["Modular Kitchen", "Modular Wardrobe", "Full Home Interior"];

export function LeadSheet({
  visible, mode, onClose,
}: {
  visible: boolean;
  mode: LeadMode;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isQuote = mode === "quote";

  // {/* <state name="form-fields" /> */}
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [detail, setDetail] = useState("");      // requirement (quote) | note (callback)
  const [preferred, setPreferred] = useState(""); // callback-only
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const reset = () => {
    setName(""); setPhone(""); setCity(""); setCategory(CATEGORIES[0]);
    setDetail(""); setPreferred(""); setErr(""); setDone(null); setSubmitting(false);
  };

  const close = () => { reset(); onClose(); };

  // {/* <handler name="submit" posts to public lead endpoint /> */}
  const submit = async () => {
    if (!name.trim() || !phone.trim()) { setErr("Name and phone are required"); return; }
    setErr(""); setSubmitting(true);
    try {
      const res = isQuote
        ? await api<{ message: string }>("/public/quote", {
            method: "POST",
            body: { name, phone, city, category, requirement: detail },
          })
        : await api<{ message: string }>("/public/callback", {
            method: "POST",
            body: { name, phone, preferred_time: preferred, note: detail },
          });
      setDone(res.message || "Thank you! Our team will be in touch shortly.");
    } catch (e: any) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
            <View style={styles.handle} />

            {/* <section id="success-state" /> */}
            {done ? (
              <View style={styles.success} testID="lead-success">
                <View style={styles.successIcon}><Feather name="check" size={26} color={C.onBrand} /></View>
                <Txt display size={FS.xxl} style={{ marginTop: S.md, textAlign: "center" }}>
                  {isQuote ? "Quote requested" : "Callback requested"}
                </Txt>
                <Txt color={C.inkMute} style={{ marginTop: S.sm, textAlign: "center", maxWidth: 300 }}>
                  {done}
                </Txt>
                <Button title="Done" onPress={close} style={{ marginTop: S.xl, alignSelf: "stretch" }} testID="lead-done-button" />
              </View>
            ) : (
              <>
                {/* <section id="header" /> */}
                <Txt size={FS.sm} weight="medium" color={C.inkMute} style={{ letterSpacing: 1.5 }}>
                  {isQuote ? "FREE & NO OBLIGATION" : "WE'LL CALL YOU"}
                </Txt>
                <Txt display size={FS.xxxl} style={{ marginTop: S.xs, marginBottom: S.xs }}>
                  {isQuote ? "Get a Free Quote" : "Request a Callback"}
                </Txt>
                <Txt color={C.inkMute} style={{ marginBottom: S.xl }}>
                  {isQuote
                    ? "Share a few details and our design team will prepare an indicative estimate."
                    : "Leave your number and a convenient time — our team will reach out."}
                </Txt>

                {/* <section id="form" /> */}
                <Field label="Name" testID="lead-name-input" placeholder="Your full name" value={name} onChangeText={setName} />
                <Field label="Phone" testID="lead-phone-input" placeholder="10-digit mobile number"
                  keyboardType="phone-pad" maxLength={15} value={phone} onChangeText={setPhone} />

                {isQuote ? (
                  <>
                    <Field label="City" testID="lead-city-input" placeholder="e.g. Pune" value={city} onChangeText={setCity} />
                    <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>
                      WHAT ARE YOU LOOKING FOR?
                    </Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingBottom: S.lg }}>
                      {CATEGORIES.map((c) => (
                        <Pressable key={c} testID={`lead-cat-${c}`} onPress={() => setCategory(c)}
                          style={[styles.chip, category === c && { backgroundColor: C.ink, borderColor: C.ink }]}>
                          <Txt size={FS.sm} weight="medium" color={category === c ? C.onBrand : C.inkSoft}>{c}</Txt>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <Field label="Preferred time" testID="lead-time-input"
                    placeholder="e.g. Today after 6 PM" value={preferred} onChangeText={setPreferred} />
                )}

                <View style={{ marginBottom: S.lg }}>
                  <Txt size={FS.sm} weight="medium" color={C.inkSoft} style={{ marginBottom: S.sm, letterSpacing: 0.3 }}>
                    {isQuote ? "REQUIREMENT (OPTIONAL)" : "MESSAGE (OPTIONAL)"}
                  </Txt>
                  <TextInput
                    testID="lead-detail-input"
                    placeholder={isQuote ? "e.g. L-shaped kitchen, 10x12 ft, budget ₹3–4L" : "Anything we should know?"}
                    placeholderTextColor={C.inkMute}
                    value={detail} onChangeText={setDetail}
                    multiline
                    style={styles.textarea}
                  />
                </View>

                {err ? <Txt color={C.error} style={{ marginBottom: S.sm }} testID="lead-error">{err}</Txt> : null}
                <Button
                  title={isQuote ? "Get My Free Quote" : "Request Callback"}
                  icon={isQuote ? "file-text" : "phone-call"}
                  onPress={submit}
                  loading={submitting}
                  testID="lead-submit-button"
                />
                <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: S.md }}>
                  By submitting you agree to be contacted by Interiojunction.
                </Txt>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: S.lg },
  chip: { height: 38, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textarea: { minHeight: 84, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md, fontFamily: "DMSans", fontSize: FS.lg, color: C.ink, textAlignVertical: "top" },
  success: { alignItems: "center", paddingVertical: S.xl },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
});
