import { Show } from "solid-js";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch, UnauthorizedError } from "../api";
import { useNavigate } from "@solidjs/router";
import { CircleAlertIcon } from "lucide-solid";

export default function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const loginMutation = useMutation(() => ({
    mutationFn: async (credentials: { username: string; password: string }) => {
      try {
        return await apiFetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credentials, auth_type: "web" }),
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          throw new Error("Invalid credentials");
        }
        throw new Error("An unknown error occurred");
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["auth", "me"],
        type: "all",
      });
      navigate("/");
    },
  }));

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    loginMutation.mutate({ username, password });
  };

  return (
    <div class="bg-base-200 flex min-h-screen items-center justify-center">
      <div class="card bg-base-100 w-96 shadow-xl">
        <div class="card-body">
          <h2 class="card-title justify-center text-2xl font-bold">Login</h2>

          <Show when={loginMutation.isError}>
            <div class="alert alert-error alert-soft">
              <CircleAlertIcon class="size-5" />
              <span>{loginMutation.error?.message}</span>
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="flex flex-col gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Username</span>
              </label>
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                class="input input-bordered"
                required
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary"
              disabled={loginMutation.isPending}
            >
              <Show when={loginMutation.isPending}>
                <span class="loading loading-spinner loading-sm" />
              </Show>
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
