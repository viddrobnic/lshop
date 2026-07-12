import { useState, type ReactNode } from "react";
import { useNavigate, type NavigateFunction } from "react-router";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { UnauthorizedError } from "@/api";

function createQueryClient(navigate: NavigateFunction) {
  let handlingUnauthorized = false;
  const handleUnauthorized = (error: Error) => {
    if (!(error instanceof UnauthorizedError) || handlingUnauthorized) {
      return;
    }

    handlingUnauthorized = true;
    client.clear();
    if (window.location.pathname !== "/login") {
      void navigate("/login", { replace: true });
    }
    queueMicrotask(() => {
      handlingUnauthorized = false;
    });
  };

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof UnauthorizedError) && failureCount < 3,
      },
    },
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({ onError: handleUnauthorized }),
  });

  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [queryClient] = useState(() => createQueryClient(navigate));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
