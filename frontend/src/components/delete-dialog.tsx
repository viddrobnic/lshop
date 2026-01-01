import { UseMutationResult } from "@tanstack/solid-query";
import { createEffect, Show, Accessor, Setter } from "solid-js";
import { Portal } from "solid-js/web";

interface DeleteDialogProps {
  title: string;
  resourceName: string;
  mutation: UseMutationResult<unknown, Error, void, unknown>;
  open: Accessor<boolean>;
  setOpen: Setter<boolean>;
}

export default function DeleteDialog(props: DeleteDialogProps) {
  let dialogRef!: HTMLDialogElement;

  createEffect(() => {
    if (props.open()) {
      dialogRef.showModal();
    } else {
      dialogRef.close();
    }
  });

  const handleDelete = () => {
    props.mutation.mutate();
  };

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class="modal modal-bottom sm:modal-middle"
        onClose={() => props.setOpen(false)}
      >
        <div class="modal-box">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => props.setOpen(false)}
          >
            ✕
          </button>
          <h3 class="text-lg font-bold">{props.title}</h3>

          <div class="py-4">
            <p>
              Are you sure you want to delete{" "}
              <strong>{props.resourceName}</strong>?
            </p>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => props.setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-error"
              disabled={props.mutation.isPending}
              onClick={handleDelete}
            >
              <Show when={props.mutation.isPending}>
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
              props.setOpen(false);
            }}
          >
            close
          </button>
        </div>
      </dialog>
    </Portal>
  );
}
