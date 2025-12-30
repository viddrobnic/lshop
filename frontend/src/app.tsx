import { Suspense, type ParentComponent } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/solid-query";
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools";
import { UnauthorizedError } from "./api";

const App: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

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
          navigate("/login");
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          queryClient.clear();
          navigate("/login");
        }
      },
    }),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <nav class="navbar bg-base-100 shadow">
        <ul class="flex items-center">
          <li class="px-4 py-2">
            <A
              href="/"
              class="no-underline hover:underline"
              activeClass="underline"
              end
            >
              Home
            </A>
          </li>
          <li class="px-4 py-2">
            <A
              href="/about"
              class="no-underline hover:underline"
              activeClass="underline"
            >
              About
            </A>
          </li>
          <li class="px-4 py-2">
            <A href="/error" class="no-underline hover:underline">
              Error
            </A>
          </li>

          <li class="ml-auto flex items-center space-x-1 text-sm">
            <span>URL:</span>
            <input
              class="w-75px rounded-lg bg-white p-1 text-sm"
              type="text"
              readOnly
              value={location.pathname}
            />
          </li>
        </ul>
      </nav>

      <main>
        <Suspense>{props.children}</Suspense>
      </main>

      <SolidQueryDevtools />
    </QueryClientProvider>
  );
};

export default App;
