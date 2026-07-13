import { Navigate, Outlet, Route, Routes } from "react-router";

import { Navigation } from "@/components/navigation";
import ItemsPage from "@/pages/items-page";
import LoginPage from "@/pages/login-page";
import NotFoundPage from "@/pages/not-found-page";
import StoresPage from "@/pages/stores-page";
import { useAuth } from "@/providers/auth-provider";

function AuthenticatedLayout() {
  const { isPending, user } = useAuth();

  if (isPending) {
    return (
      <section className="px-4 py-6">
        <h1 className="text-primary text-3xl font-bold">Loading...</h1>
      </section>
    );
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
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<ItemsPage />} />
        <Route path="/stores" element={<StoresPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
