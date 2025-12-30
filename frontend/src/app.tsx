import { Suspense, type ParentComponent } from "solid-js";
import { QueryProvider } from "./providers/query-client";
import { AuthenticatedGuard, AuthProvider } from "./providers/auth";
import { Navbar } from "./components/navbar";

export const App: ParentComponent = (props) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <Suspense>{props.children}</Suspense>
      </AuthProvider>
    </QueryProvider>
  );
};

export const AuthenticatedApp: ParentComponent = (props) => {
  return (
    <AuthenticatedGuard>
      <Navbar />
      <Suspense>{props.children}</Suspense>
    </AuthenticatedGuard>
  );
};
