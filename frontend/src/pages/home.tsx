import { createSignal } from "solid-js";

export default function Home() {
  const [count, setCount] = createSignal(0);

  return (
    <section class="p-8">
      <h1 class="text-2xl font-bold">Home</h1>
      <p class="mt-4">This is the home page.</p>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          class="rounded-lg border border-gray-900 px-2"
          onClick={() => setCount(count() - 1)}
        >
          -
        </button>

        <output class="p-10px">Count: {count()}</output>

        <button
          type="button"
          class="rounded-lg border border-gray-900 px-2"
          onClick={() => setCount(count() + 1)}
        >
          +
        </button>
      </div>
    </section>
  );
}
