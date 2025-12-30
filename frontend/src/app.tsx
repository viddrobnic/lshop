import { Suspense, type ParentComponent } from "solid-js";
import { QueryProvider } from "./providers/query-client";
import { AuthProvider } from "./providers/auth";
import { Navbar } from "./components/navbar";

const App: ParentComponent = (props) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <Navbar />
        <main>
          <Suspense>{props.children}</Suspense>
        </main>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;
