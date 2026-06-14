import React, { useState } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  Pressable, ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "@/src/auth";
import { Txt, Button, Field } from "@/src/components/ui";
import { C, S, R, FS } from "@/src/theme";

const HERO =
  "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

type Mode = "customer" | "staff";

export default function Login() {
  const { loginEmail, requestOtp, verifyOtp, guestLogin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("customer");
  const [staffEmailMode, setStaffEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = (m: Mode) => {
    setMode(m); setError(""); setOtpSent(false); setOtp(""); setDevCode(undefined);
    setStaffEmailMode(false);
  };

  const doStaffLogin = async () => {
    setError(""); setLoading(true);
    try {
      await loginEmail(email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doRequestOtp = async () => {
    setError(""); setLoading(true);
    try {
      const code = await requestOtp(phone.trim());
      setDevCode(code);
      if (code) setOtp(code);
      setOtpSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doVerifyOtp = async () => {
    setError(""); setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doGuest = async () => {
    setError(""); setLoading(true);
    try {
      await guestLogin();
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const otpHint =
    mode === "staff"
      ? "Staff sign in with their registered mobile number and a one-time code."
      : "We'll text a one-time code to verify your number.";

  // Shared phone + OTP block, used by both customer and staff (primary method).
  const phoneOtpBlock = (
    <>
      <Field
        label="Phone number"
        icon="phone"
        testID="phone-input"
        placeholder={mode === "staff" ? "Registered mobile number" : "9000000001"}
        keyboardType="phone-pad"
        editable={!otpSent}
        value={phone}
        onChangeText={setPhone}
      />
      {!otpSent && (
        <Txt size={FS.sm} color={C.inkMute} style={{ marginTop: -S.md, marginBottom: S.lg }}>
          {otpHint}
        </Txt>
      )}
      {otpSent && (
        <>
          <Field
            label="Enter OTP"
            icon="key"
            testID="otp-input"
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          {devCode ? (
            <View style={styles.devNote} testID="dev-code-note">
              <Feather name="info" size={14} color={C.warning} />
              <Txt size={FS.sm} color={C.inkSoft} style={{ marginLeft: 6 }}>
                Demo mode — your code is {devCode}
              </Txt>
            </View>
          ) : null}
        </>
      )}
      {error ? <Txt color={C.error} style={{ marginBottom: S.md }} testID="login-error">{error}</Txt> : null}
      {!otpSent ? (
        <Button title="Send OTP" onPress={doRequestOtp} loading={loading} testID="send-otp-button" />
      ) : (
        <>
          <Button title="Verify & Continue" onPress={doVerifyOtp} loading={loading} testID="verify-otp-button" />
          <Pressable onPress={() => { setOtpSent(false); setOtp(""); setDevCode(undefined); setError(""); }} style={{ marginTop: S.md, alignItems: "center" }}>
            <Txt color={C.inkMute} size={FS.sm}>Change number</Txt>
          </Pressable>
        </>
      )}
    </>
  );

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: HERO }} style={[styles.hero, { paddingTop: insets.top }]}>
        <LinearGradient colors={["rgba(0,0,0,0.25)", "rgba(26,26,26,0.95)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroContent}>
          <Txt size={FS.sm} weight="medium" color="rgba(253,250,246,0.85)" style={{ letterSpacing: 3 }}>
            FACTORY-DIRECT INTERIORS
          </Txt>
          <Txt display size={42} color={C.onInverse} style={{ marginTop: S.sm, lineHeight: 48 }}>
            Interiojunction
          </Txt>
        </View>
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Txt display size={FS.xxl} style={{ marginBottom: S.xs }}>Welcome back</Txt>
          <Txt color={C.inkMute} style={{ marginBottom: S.xl }}>
            Sign in to track your project or manage operations.
          </Txt>

          <View style={styles.toggle}>
            <Pressable
              testID="mode-customer-tab"
              style={[styles.toggleBtn, mode === "customer" && styles.toggleActive]}
              onPress={() => reset("customer")}
            >
              <Feather name="user" size={15} color={mode === "customer" ? C.onBrand : C.inkSoft} />
              <Txt weight="medium" color={mode === "customer" ? C.onBrand : C.inkSoft} style={{ marginLeft: 6 }}>
                Customer
              </Txt>
            </Pressable>
            <Pressable
              testID="mode-staff-tab"
              style={[styles.toggleBtn, mode === "staff" && styles.toggleActive]}
              onPress={() => reset("staff")}
            >
              <Feather name="briefcase" size={15} color={mode === "staff" ? C.onBrand : C.inkSoft} />
              <Txt weight="medium" color={mode === "staff" ? C.onBrand : C.inkSoft} style={{ marginLeft: 6 }}>
                Staff
              </Txt>
            </Pressable>
          </View>

          {mode === "staff" ? (
            staffEmailMode ? (
              <>
                <Field
                  label="Email"
                  icon="mail"
                  testID="email-input"
                  placeholder="you@interiojunction.in"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Field
                  label="Password"
                  icon="lock"
                  testID="password-input"
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                {error ? <Txt color={C.error} style={{ marginBottom: S.md }} testID="login-error">{error}</Txt> : null}
                <Button title="Sign In" onPress={doStaffLogin} loading={loading} testID="staff-login-button" />
                <Pressable
                  testID="staff-otp-switch"
                  onPress={() => { setStaffEmailMode(false); setError(""); }}
                  style={{ marginTop: S.lg, alignItems: "center" }}
                >
                  <Txt color={C.inkSoft} size={FS.sm} weight="medium">Sign in with phone OTP instead</Txt>
                </Pressable>
              </>
            ) : (
              <>
                {phoneOtpBlock}
                <Pressable
                  testID="staff-email-switch"
                  onPress={() => { setStaffEmailMode(true); setOtpSent(false); setOtp(""); setDevCode(undefined); setError(""); }}
                  style={{ marginTop: S.lg, alignItems: "center" }}
                >
                  <Txt color={C.inkSoft} size={FS.sm} weight="medium">Sign in with email & password instead</Txt>
                </Pressable>
              </>
            )
          ) : (
            <>
              {phoneOtpBlock}
              {!otpSent && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.divLine} />
                    <Txt size={FS.sm} color={C.inkMute} style={{ marginHorizontal: S.md }}>or</Txt>
                    <View style={styles.divLine} />
                  </View>
                  <Button
                    title="Continue as Guest"
                    variant="outline"
                    icon="arrow-right-circle"
                    onPress={doGuest}
                    loading={loading}
                    testID="guest-login-button"
                  />
                  <Txt size={FS.sm} color={C.inkMute} style={{ textAlign: "center", marginTop: S.md }}>
                    Explore the app & start a project instantly — no phone number needed.
                  </Txt>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  hero: { height: 300, justifyContent: "flex-end" },
  heroContent: { padding: S.xl, paddingBottom: S.xxl },
  sheet: {
    flex: 1, marginTop: -24, backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  toggle: {
    flexDirection: "row", backgroundColor: C.surface3, borderRadius: R.md,
    padding: 4, marginBottom: S.xl,
  },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 44, borderRadius: R.md - 2,
  },
  toggleActive: { backgroundColor: C.ink },
  devNote: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.tint,
    borderRadius: R.md, padding: S.md, marginBottom: S.lg,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: S.lg },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong },
});
