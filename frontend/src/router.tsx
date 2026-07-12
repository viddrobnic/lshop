import { Navigate, Outlet, Route, Routes } from "react-router";

import { Navigation } from "@/components/navigation";
import ItemsPage from "@/pages/items-page";
import LoginPage from "@/pages/login-page";
import { useAuth } from "@/providers/auth-provider";
import NotFoundPage from "@/pages/not-found-page";
import { StoresPage } from "@/pages/stores-page";

function RoutePlaceholder({ title }: { title: string }) {
  return (
    <section className="px-4 py-6">
      <h1 className="text-primary text-3xl font-bold">{title}</h1>
    </section>
  );
}

function GuestLayout() {
  const { isPending, user } = useAuth();

  if (isPending) {
    return <RoutePlaceholder title="Loading..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function AuthenticatedLayout() {
  const { isPending, user } = useAuth();

  if (isPending) {
    return <RoutePlaceholder title="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-xl py-6 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
    </>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<ItemsPage />} />
        <Route path="/stores" element={<StoresPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
