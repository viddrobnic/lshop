import { A, useLocation } from "@solidjs/router";
import { useAuth } from "../providers/auth";

export function Navbar() {
  const location = useLocation();
  const user = useAuth();

  return (
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

        <li>User: {user.user()?.id ?? "None"}</li>

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
  );
}
