import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch, UnauthorizedError } from "@/api";
import { queryKeys } from "@/data/query-keys";

export type User = {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: User | null | undefined;
  isPending: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getUser(signal: AbortSignal): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me", { signal });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }

    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => getUser(signal),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const value = useMemo(
    () => ({ user: query.data, isPending: query.isPending }),
    [query.data, query.isPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
