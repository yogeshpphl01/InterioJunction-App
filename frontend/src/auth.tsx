import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, setAuthToken } from "@/src/api";

export type User = {
  id: string;
  role: "admin" | "sales" | "factory" | "customer";
  name?: string;
  email?: string;
  phone?: string;
  is_guest?: boolean;
};

type AuthCtx = {
  user: User | null;
  booting: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>;
  guestLogin: (name?: string) => Promise<void>;
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

  const guestLogin = useCallback(async (name?: string) => {
    const res = await api<{ token: string; user: User }>("/auth/guest", {
      method: "POST",
      body: { name },
    });
    await persist(res.token, res.user);
  }, [persist]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await storage.secureRemove("ij_token");
    await storage.removeItem("ij_user");
  }, []);

  return (
    <Ctx.Provider value={{ user, booting, loginEmail, requestOtp, verifyOtp, guestLogin, logout }}>
      {children}
    </Ctx.Provider>
  );
}
