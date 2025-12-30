import { type ParentComponent } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/solid-query";
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools";
import { UnauthorizedError } from "../api";

export const QueryProvider: ParentComponent = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof UnauthorizedError) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          queryClient.clear();
          if (location.pathname !== "/login") {
            navigate("/login");
          }
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          queryClient.clear();
          if (location.pathname !== "/login") {
            navigate("/login");
          }
        }
      },
    }),
  });

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <SolidQueryDevtools />
    </QueryClientProvider>
  );
};
