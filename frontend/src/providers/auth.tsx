import {
  createContext,
  useContext,
  type ParentComponent,
  type Accessor,
} from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { apiFetch, UnauthorizedError } from "../api";

export type User = {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
};

async function getUser(): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    throw error;
  }
}

type AuthContextValue = {
  user: Accessor<User | null | undefined>;
  isPending: Accessor<boolean>;
};

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
  const query = useQuery(() => ({
    queryKey: ["auth", "me"],
    queryFn: getUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  }));

  const value: AuthContextValue = {
    user: () => query.data,
    isPending: () => query.isPending,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
