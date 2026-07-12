import { type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AppRouter } from "@/router";

export function App({ children }: { children?: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children ?? <AppRouter />}</AuthProvider>
      <Toaster position="bottom-right" />
    </QueryProvider>
  );
}
