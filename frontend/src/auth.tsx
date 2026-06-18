/**
 * <module name="auth" layer="frontend" kind="context-provider">
 *   <purpose>
 *     App-wide auth state + actions (loginEmail, requestOtp, verifyOtp, logout).
 *     On boot, restores the JWT from secure storage and revalidates via /auth/me.
 *   </purpose>
 *   <storage>JWT → SecureStore (Keychain/EncryptedSharedPrefs); user profile → AsyncStorage.</storage>
 *   <consumers>useAuth() across screens; mounted by RootLayout.</consumers>
 * </module>
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, setAuthToken } from "@/src/api";

export type User = {
  id: string;
  role: "admin" | "sales" | "factory" | "customer";
  name?: string;
  email?: string;
  phone?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ TEMPORARY DEV LOGIN BYPASS — for UI testing only.
// While DEV_BYPASS_LOGIN is true, the app skips the login screen and enters
// directly as DEV_BYPASS_USER. Nothing about the real auth code is removed —
// flip this flag back to `false` to restore the normal phone-OTP / email login.
//
// Notes:
//  • Change DEV_BYPASS_ROLE to test a different surface: "customer" | "factory" | "admin" | "sales".
//  • No backend token is set, so API-backed lists may be empty if the backend
//    isn't reachable — but navigation, branding and the Kitchen Calculator
//    (fully client-side) are usable offline.
//  • For the "customer" role we ALSO attempt a silent demo sign-in in the
//    background, so if the backend IS reachable (with DEMO_MODE on) real data loads.
// ─────────────────────────────────────────────────────────────────────────────
const DEV_BYPASS_LOGIN = true;
const DEV_BYPASS_ROLE: User["role"] = "customer";
const DEV_BYPASS_USER: User = {
  id: "dev-bypass",
  role: DEV_BYPASS_ROLE,
  name: "Test User",
  email: "test@interiojunction.in",
  phone: "1234567890",
};

type AuthCtx = {
  user: User | null;
  booting: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const persist = useCallback(async (token: string, u: User) => {
    setAuthToken(token);
    setUser(u);
    await storage.secureSet("ij_token", token);
    await storage.setItem("ij_user", JSON.stringify(u));
  }, []);

  useEffect(() => {
    (async () => {
      // ── TEMPORARY DEV BYPASS (see DEV_BYPASS_LOGIN above) ──────────────────
      if (DEV_BYPASS_LOGIN) {
        setUser(DEV_BYPASS_USER);   // enter the app immediately as the test user
        setBooting(false);
        // Best-effort silent demo sign-in so real data loads when the backend is
        // reachable (DEMO_MODE on). Harmless / ignored if offline.
        if (DEV_BYPASS_ROLE === "customer") {
          try {
            const res = await api<{ token: string; user: User }>("/auth/otp/verify", {
              method: "POST",
              body: { phone: "1234567890", code: "1234567890" },
            });
            setAuthToken(res.token);
            setUser(res.user);
          } catch {
            /* backend offline — stay on the offline bypass user */
          }
        }
        return;
      }
      // ──────────────────────────────────────────────────────────────────────
      const token = await storage.secureGet("ij_token", "");
      if (token) {
        setAuthToken(token as string);
        try {
          const res = await api<{ user: User }>("/auth/me");
          setUser(res.user);
        } catch {
          setAuthToken(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await persist(res.token, res.user);
  }, [persist]);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await api<{ dev_code?: string }>("/auth/otp/request", {
      method: "POST",
      body: { phone },
    });
    return res.dev_code;
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string, name?: string) => {
    const res = await api<{ token: string; user: User }>("/auth/otp/verify", {
      method: "POST",
      body: { phone, code, name },
    });
    await persist(res.token, res.user);
  }, [persist]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await storage.secureRemove("ij_token");
    await storage.removeItem("ij_user");
    // While the dev bypass is on, "Sign Out" stays in the app (login is skipped).
    if (DEV_BYPASS_LOGIN) { setUser(DEV_BYPASS_USER); return; }
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, booting, loginEmail, requestOtp, verifyOtp, logout }}>
      {children}
    </Ctx.Provider>
  );
}
