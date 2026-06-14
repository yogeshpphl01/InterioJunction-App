import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, StyleSheet, Platform, ScrollView,
  TextInput, Pressable, ActivityIndicator, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
  const tabBarHeight = useBottomTabBarHeight();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sid, setSid] = useState<string | undefined>();
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = useCallback((delay = 60) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), delay);
  }, []);

  // Keep the latest message + input bar visible above the keyboard, and allow
  // the conversation to stay scrollable while the keypad is open.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      // The keyboard overlaps the tab bar that sits below this screen, so only
      // lift the content by the part of the keyboard above that tab bar.
      const h = (e.endCoordinates?.height ?? 0) - tabBarHeight;
      setKbHeight(h > 0 ? h : 0);
      scrollToEnd(50);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, [scrollToEnd, tabBarHeight]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    scrollToEnd(50);
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
      scrollToEnd(80);
    }
  }, [sending, sid, scrollToEnd]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Design AI" subtitle="Interiojunction Assistant" />
      {/* Manual keyboard handling (works under edge-to-edge on both platforms). */}
      <View style={{ flex: 1, marginBottom: kbHeight }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: S.lg, paddingBottom: S.lg, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => { if (messages.length) scrollToEnd(0); }}
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

        <View style={[styles.inputBar, { paddingBottom: kbHeight > 0 ? S.md : (insets.bottom > 0 ? insets.bottom : S.md) }]}>
          <TextInput
            testID="ai-input"
            placeholder="Ask about design or pricing…"
            placeholderTextColor={C.inkMute}
            value={input}
            onChangeText={setInput}
            onFocus={() => scrollToEnd(120)}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <Pressable testID="ai-send-button" onPress={() => send(input)} disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}>
            <Feather name="arrow-up" size={20} color={C.onBrand} />
          </Pressable>
        </View>
      </View>
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
