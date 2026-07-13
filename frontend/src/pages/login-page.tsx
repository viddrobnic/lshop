import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import type { SyntheticEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";

import { apiFetch, UnauthorizedError } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import { useAuth } from "@/providers/auth-provider";

type Credentials = { username: string; password: string };

export default function LoginPage() {
  const { isPending, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const loginMutation = useMutation({
    mutationFn: async (credentials: Credentials) => {
      try {
        return await apiFetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credentials, auth_type: "web" }),
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          throw new Error("Invalid credentials", { cause: error });
        }

        throw new Error("An unknown error occurred", { cause: error });
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: queryKeys.auth.me,
        type: "all",
      });
      void navigate("/");
    },
    onError: () => toast.error("Failed to log in", { duration: 6000 }),
  });

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    loginMutation.mutate({
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    });
  }

  if (isPending) {
    return (
      <main className="bg-muted flex min-h-screen items-center justify-center px-4">
        <h1 className="text-primary text-3xl font-bold">Loading...</h1>
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="bg-muted flex min-h-screen items-center justify-center px-4">
      <section
        aria-labelledby="login-title"
        className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-xl"
      >
        <h1 id="login-title" className="mb-6 text-center text-2xl font-bold">
          Login
        </h1>
        {loginMutation.isError && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlertIcon />
            <AlertDescription>{loginMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Enter username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending && <Spinner data-icon="inline-start" />}
            Login
          </Button>
        </form>
      </section>
    </main>
  );
}
