import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createEffect, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";

export default function AddSectionDialog(props: { storeId: number }) {
  const [open, setOpen] = createSignal(false);

  const queryClient = useQueryClient();

  let dialogRef!: HTMLDialogElement;
  let formRef!: HTMLFormElement;

  createEffect(() => {
    if (open()) {
      formRef.reset();
      dialogRef.showModal();
    } else {
      dialogRef.close();
    }
  });

  const createMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch(`/stores/${props.storeId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId],
      });
      setOpen(false);
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    createMutation.mutate(name);
  };

  return (
    <>
      <button
        class="btn btn-sm btn-soft btn-secondary btn-circle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <PlusIcon class="size-4" />
      </button>

      <Portal>
        <dialog
          ref={dialogRef}
          class="modal modal-bottom sm:modal-middle"
          onClose={() => setOpen(false)}
        >
          <div class="modal-box">
            <button
              class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <h3 class="text-lg font-bold">Add Section</h3>

            <form onSubmit={handleSubmit} ref={formRef}>
              <div class="py-4">
                <input
                  name="name"
                  type="text"
                  placeholder="Section Name"
                  class="input w-full"
                  required
                  autofocus
                />
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={createMutation.isPending}
                >
                  <Show when={createMutation.isPending}>
                    <span class="loading loading-spinner mr-1 size-4" />
                  </Show>
                  Create
                </button>
              </div>
            </form>
          </div>

          <div class="modal-backdrop">
            <button
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            >
              close
            </button>
          </div>
        </dialog>
      </Portal>
    </>
  );
}
