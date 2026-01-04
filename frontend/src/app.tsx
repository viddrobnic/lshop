import { Suspense, type ParentComponent } from "solid-js";
import { QueryProvider } from "./providers/query-client";
import { AuthenticatedGuard, AuthProvider } from "./providers/auth";
import { Navigation } from "./components/navbar";
import { Toaster } from "solid-toast";

export const App: ParentComponent = (props) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <Toaster position="bottom-right" />
        <Suspense>{props.children}</Suspense>
      </AuthProvider>
    </QueryProvider>
  );
};

export const AuthenticatedApp: ParentComponent = (props) => {
  return (
    <AuthenticatedGuard>
      <Navigation />
      <main class="mx-auto w-full max-w-xl py-6 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Suspense>{props.children}</Suspense>
      </main>
    </AuthenticatedGuard>
  );
};
