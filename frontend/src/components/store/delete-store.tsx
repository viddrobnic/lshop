import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createEffect, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { apiFetch } from "../../api";
import { SetStoreFunction } from "solid-js/store";

export default function DeleteStoreDialog(props: {
  store: { id: number; name: string; open: boolean };
  setStore: SetStoreFunction<{ id: number; name: string; open: boolean }>;
}) {
  const queryClient = useQueryClient();

  let dialogRef!: HTMLDialogElement;

  createEffect(() => {
    if (props.store.open) {
      dialogRef.showModal();
    } else {
      dialogRef.close();
    }
  });

  const deleteMutation = useMutation(() => ({
    mutationFn: async () =>
      apiFetch(`/stores/${props.store.id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      props.setStore("open", false);
    },
  }));

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class="modal modal-bottom sm:modal-middle"
        onClose={() => props.setStore("open", false)}
      >
        <div class="modal-box">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => props.setStore("open", false)}
          >
            ✕
          </button>
          <h3 class="text-lg font-bold">Delete</h3>

          <div class="py-4">
            <p>
              Are you sure you want to delete{" "}
              <strong>{props.store.name}</strong>?
            </p>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => props.setStore("open", false)}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-error"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              <Show when={deleteMutation.isPending}>
                <span class="loading loading-spinner mr-1 size-4" />
              </Show>
              Delete
            </button>
          </div>
        </div>

        <div class="modal-backdrop">
          <button
            onClick={(e) => {
              e.preventDefault();
              props.setStore("open", false);
            }}
          >
            close
          </button>
        </div>
      </dialog>
    </Portal>
  );
}
