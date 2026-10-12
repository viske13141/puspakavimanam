import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isRedirect, redirect } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "CUSTOMER" | "SALES" | "ADMIN" | "OPERATIONS" | "OPERATOR";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  role: UserRole;
  country: string | null;
  company: string | null;
  avatar_url: string | null;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

type AuthValue = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(_userId: string): Promise<Profile> {
  // Use security-definer RPC to avoid RLS recursion on profiles table
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) throw new Error("Profile not found.");
  return (Array.isArray(data) ? data[0] : data) as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applySession = (nextSession: Session | null) => {
      const current = ++revision;
      setSession(nextSession);
      setProfile(null);
      if (timer) clearTimeout(timer);
      if (!nextSession?.user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      // Supabase auth callbacks run under its session lock. Fetch after returning.
      timer = setTimeout(() => {
        void loadProfile(nextSession.user.id)
          .then((nextProfile) => {
            if (active && current === revision) setProfile(nextProfile);
          })
          .catch(() => {
            if (active && current === revision) setProfile(null);
          })
          .finally(() => {
            if (active && current === revision) setLoading(false);
          });
      }, 0);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) applySession(nextSession);
    });
    return () => {
      active = false;
      ++revision;
      if (timer) clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      profile,
      session,
      role: profile?.role ?? null,
      isLoading,

      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid login")) {
            throw new Error("Invalid email or password.");
          }
          if (error.message.toLowerCase().includes("email not confirmed")) {
            throw new Error("Please verify your email before signing in.");
          }
          throw new Error(error.message);
        }
      },

      register: async (input) => {
        if (input.password !== input.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (input.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              mobile: input.mobile,
            },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already registered")) {
            throw new Error("An account with this email already exists.");
          }
          throw new Error(error.message);
        }
        // If identities is empty, email confirmation is required
        const needsConfirmation =
          !data.session &&
          (!data.user?.identities || data.user.identities.length === 0 || !data.session);
        return { needsConfirmation: needsConfirmation || !data.session };
      },

      resetPassword: async (email) => {
        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : "/reset-password";
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw new Error(error.message);
      },

      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
        setProfile(null);
        setSession(null);
      },

      refreshProfile: async () => {
        if (session?.user) {
          try {
            setProfile(await loadProfile(session.user.id));
          } catch {
            // ignore
          }
        }
      },
    }),
    [session, profile, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function dashboardForRole(role: UserRole | null | undefined) {
  if (role === "ADMIN") return "/admin/dashboard" as const;
  if (role === "SALES") return "/sales/dashboard" as const;
  if (role === "OPERATIONS") return "/operations/dashboard" as const;
  if (role === "OPERATOR") return "/operator/dashboard" as const;
  if (role === "CUSTOMER") return "/customer/dashboard" as const;
  return "/login" as const;
}

export class StaffAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffAccessError";
  }
}

export async function validateStaffMembership(profile: Profile) {
  if (profile.role === "SALES") {
    const { data, error } = await supabase
      .from("sales_members")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new StaffAccessError(
        "This Sales account has no team record. Contact an administrator.",
      );
    }
  } else if (profile.role === "OPERATIONS") {
    const { data, error } = await supabase
      .from("operations_members")
      .select("status")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.status !== "active") {
      throw new StaffAccessError(
        "This Operations account is not active. Contact an administrator.",
      );
    }
  } else if (profile.role === "OPERATOR") {
    const { data, error } = await supabase
      .from("operators")
      .select("status")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.status !== "active") {
      throw new StaffAccessError("This Operator account is not active. Contact an administrator.");
    }
  }
}

/** Server-side / beforeLoad route guard — redirects if not authenticated or wrong role. */
export async function requireRoleAccess(roles: UserRole[]) {
  if (typeof window === "undefined") return; // skip on SSR
  // Demo mode: bypass auth entirely and allow direct dashboard access
  if (sessionStorage.getItem("demo_mode") === "1") return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/login" });
  try {
    const profile = await loadProfile(user.id);
    if (!roles.includes(profile.role)) {
      throw redirect({ to: dashboardForRole(profile.role) });
    }
    await validateStaffMembership(profile);
  } catch (e) {
    // If it's a redirect, re-throw it
    if (isRedirect(e)) throw e;
    if (e instanceof StaffAccessError) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      throw redirect({ to: "/login" });
    }
    // Profile missing or RLS error — send to login
    throw redirect({ to: "/login" });
  }
}

/** Redirects authenticated users away from guest-only pages. */
export async function requireGuestAccess() {
  if (typeof window === "undefined") return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      const profile = await loadProfile(user.id);
      await validateStaffMembership(profile);
      throw redirect({ to: dashboardForRole(profile.role) });
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (error instanceof StaffAccessError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        return;
      }
      // Keep login available when profile lookup fails instead of creating a redirect loop.
    }
  }
}
