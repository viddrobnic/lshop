import { A } from "@solidjs/router";
import { ListIcon, StoreIcon } from "lucide-solid";
import { For } from "solid-js";

const navItems = [
  { href: "/", label: "Items", Icon: ListIcon },
  { href: "/stores", label: "Stores", Icon: StoreIcon },
];

export function Navbar() {
  return (
    <>
      <nav class="navbar hidden bg-white shadow md:flex">
        <div class="mx-auto flex w-full max-w-3xl items-center">
          <div class="flex-1">
            <a class="btn btn-ghost text-xl" href="/">
              LShop
            </a>
          </div>

          <div class="flex-none">
            <ul class="flex items-center gap-x-4 px-1">
              <For each={navItems}>
                {(item) => (
                  <li>
                    <A
                      href={item.href}
                      class="hover:bg-base-100 text-sm font-semibold hover:underline hover:decoration-2 hover:underline-offset-4"
                      activeClass="underline underline-offset-4 decoration-2"
                      end
                    >
                      {item.label}
                    </A>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </div>
      </nav>

      <nav class="dock bg-white shadow md:hidden">
        <For each={navItems}>
          {(item) => (
            <A href={item.href} activeClass="dock-active" end>
              <item.Icon class="size-[1.2rem]" />
              <span class="dock-label">{item.label}</span>
            </A>
          )}
        </For>
      </nav>
    </>
  );
}
