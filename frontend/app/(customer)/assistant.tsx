/**
 * <screen route="/(customer)/assistant" name="Assistant" role="customer">
 *   <purpose>AI design/quote chat (₹ estimates) backed by POST /ai/chat (gpt-4o).</purpose>
 *   <data>session_id persisted in state; messages held in component state.</data>
 *   <sections>intro+suggestions · message-bubbles · input-bar</sections>
 * </screen>
 */
import React, { useState, useRef, useCallback } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TextInput, Pressable, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/api";
import { Txt } from "@/src/components/ui";
import { Header } from "@/src/components/Header";
import { C, S, R, FS } from "@/src/theme";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Quote for an L-shaped kitchen",
  "Wardrobe ideas for a small room",
  "What finishes do you offer?",
];

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sid, setSid] = useState<string | undefined>();
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await api<{ reply: string; session_id: string }>("/ai/chat", {
        method: "POST", body: { message: text, session_id: sid },
      });
      setSid(res.session_id);
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [sending, sid]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Design AI" subtitle="Interiojunction Assistant" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: S.lg, paddingBottom: S.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.intro}>
              <View style={styles.introIcon}><Feather name="zap" size={22} color={C.onBrand} /></View>
              <Txt display size={FS.xxl} style={{ textAlign: "center", marginTop: S.md }}>{"Let's design your space"}</Txt>
              <Txt color={C.inkMute} style={{ textAlign: "center", marginTop: S.sm, maxWidth: 300 }}>
                {"Describe your room and requirements — I'll suggest ideas and a ballpark quote in ₹."}
              </Txt>
              <View style={{ marginTop: S.xl, width: "100%", gap: S.sm }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} testID={`suggestion-${s}`} onPress={() => send(s)} style={styles.suggestion}>
                    <Feather name="arrow-up-right" size={15} color={C.inkSoft} />
                    <Txt color={C.inkSoft} style={{ marginLeft: S.sm }}>{s}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[styles.bubbleRow, m.role === "user" ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
              <View style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}>
                <Txt color={m.role === "user" ? C.onBrand : C.ink} size={FS.base} style={{ lineHeight: 21 }}>{m.text}</Txt>
              </View>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubbleRow, { justifyContent: "flex-start" }]}>
              <View style={[styles.bubble, styles.aiBubble, { flexDirection: "row", alignItems: "center" }]}>
                <ActivityIndicator size="small" color={C.inkSoft} />
                <Txt color={C.inkMute} style={{ marginLeft: S.sm }}>Thinking…</Txt>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : S.md }]}>
          <TextInput
            testID="ai-input"
            placeholder="Ask about design or pricing…"
            placeholderTextColor={C.inkMute}
            value={input}
            onChangeText={setInput}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <Pressable testID="ai-send-button" onPress={() => send(input)} disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}>
            <Feather name="arrow-up" size={20} color={C.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: "center", paddingTop: S.xxl, paddingHorizontal: S.lg },
  introIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  suggestion: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md },
  bubbleRow: { flexDirection: "row", marginBottom: S.md },
  bubble: { maxWidth: "84%", paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.lg },
  userBubble: { backgroundColor: C.ink, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: S.lg, paddingTop: S.md, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, gap: S.sm },
  input: { flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, paddingHorizontal: S.lg, paddingTop: 11, paddingBottom: 11, fontFamily: "DMSans", fontSize: FS.lg, color: C.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
});
