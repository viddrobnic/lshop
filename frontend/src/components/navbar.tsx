import { A, useNavigate } from "@solidjs/router";
import { ListIcon, LogOutIcon, StoreIcon, UserIcon } from "lucide-solid";
import { For } from "solid-js";
import { useAuth } from "../providers/auth";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { showErrorToast } from "./toast/error-toast";

const navItems = [
  { href: "/", label: "Items", Icon: ListIcon },
  { href: "/stores", label: "Stores", Icon: StoreIcon },
];

function useLogoutMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(() => ({
    mutationFn: async () =>
      apiFetch("/auth/logout", {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["auth", "me"],
        type: "all",
      });
      navigate("/login");
    },
    onError: () => showErrorToast("Failed to log out"),
  }));
}

function NavBar() {
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();

  return (
    <nav class="navbar hidden bg-white shadow md:flex">
      <div class="mx-auto flex w-full max-w-2xl items-center">
        <div class="flex-1">
          <a class="btn btn-ghost text-xl" href="/">
            LShop
          </a>
        </div>

        <div class="flex-none">
          <ul class="flex items-center gap-x-1 px-1">
            <For each={navItems}>
              {(item) => (
                <li>
                  <A
                    href={item.href}
                    class="btn btn-sm btn-ghost"
                    activeClass=""
                    end
                  >
                    <item.Icon class="size-3.5" />
                    {item.label}
                  </A>
                </li>
              )}
            </For>

            <li class="dropdown dropdown-end ml-3">
              <div
                tabindex="0"
                role="button"
                class="avatar avatar-placeholder cursor-pointer"
              >
                <div class="bg-primary text-primary-content w-8 rounded-full uppercase">
                  <span>{user()?.username.slice(0, 1) ?? "?"}</span>
                </div>
              </div>
              <ul
                tabindex="-1"
                class="menu menu-sm dropdown-content bg-base-200 rounded-box z-1 mt-4 w-52 p-2 shadow-md"
              >
                <li>
                  <button onClick={() => logoutMutation.mutate()}>
                    <LogOutIcon class="size-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Dock() {
  const logoutMutation = useLogoutMutation();

  return (
    <nav class="dock z-50 bg-white shadow md:hidden">
      <For each={navItems}>
        {(item) => (
          <A href={item.href} activeClass="dock-active" end>
            <item.Icon class="size-[1.2rem]" />
            <span class="dock-label">{item.label}</span>
          </A>
        )}
      </For>

      <div class="dropdown dropdown-end dropdown-top h-full">
        <div
          tabindex="0"
          role="button"
          class="flex h-full flex-col items-center justify-center gap-px"
        >
          <UserIcon class="size-[1.2rem]" />
          <span class="dock-label">User</span>
        </div>
        <ul
          tabindex="-1"
          class="menu menu-sm dropdown-content bg-base-200 rounded-box z-1 mb-2 w-52 p-2 shadow-md"
        >
          <li>
            <button onClick={() => logoutMutation.mutate()}>
              <LogOutIcon class="size-4" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export function Navigation() {
  return (
    <>
      <NavBar />
      <Dock />
    </>
  );
}
