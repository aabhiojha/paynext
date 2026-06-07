import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "TENANT_USER";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
  fullName: string | null;
  tenantId: number | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: "paynext-auth",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return sessionStorage;
        return localStorage;
      }),
    }
  )
);
