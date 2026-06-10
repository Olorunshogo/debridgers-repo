import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getAccessToken,
  decodeJwtPayload,
  storeTokens,
  logout as apiLogout,
  BASE_BACKEND_URL,
} from "@debridgers/api-client";
import type { JwtPayload } from "@debridgers/api-client";

interface AuthUser {
  sub: number;
  email: string;
  role: "buyer" | "agent" | "admin";
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  dashboardPath: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readUserFromToken(): AuthUser | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload<JwtPayload & { exp?: number }>(token);
  if (!payload) return null;
  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return {
    sub: payload.sub as unknown as number,
    email: payload.email ?? "",
    role: (payload.role as AuthUser["role"]) ?? "buyer",
  };
}

function dashboardForRole(role: string): string {
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "agent":
      return "/agent-dashboard";
    default:
      return "/buyer-dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from stored token on mount
  useEffect(() => {
    setUser(readUserFromToken());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE_BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        res.status === 401
          ? "Invalid email or password."
          : (json.message ?? "Login failed."),
      );
    }
    storeTokens(json.data.accessToken, json.data.refreshToken);
    setUser(readUserFromToken());
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const dashboardPath = user ? dashboardForRole(user.role) : "/buyer-dashboard";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        dashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
