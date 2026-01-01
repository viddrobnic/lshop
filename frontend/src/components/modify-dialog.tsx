import { UseMutationResult } from "@tanstack/solid-query";
import { createEffect, Show, JSX, Accessor, Setter } from "solid-js";
import { Portal } from "solid-js/web";

interface ModifyDialogProps {
  title: string;
  mode: "create" | "edit";
  mutation: UseMutationResult<unknown, Error, string, unknown>;
  open: Accessor<boolean>;
  setOpen: Setter<boolean>;
  currentName?: string;
  children?: JSX.Element;
}

export default function ModifyDialog(props: ModifyDialogProps) {
  let dialogRef!: HTMLDialogElement;
  let formRef!: HTMLFormElement;
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open()) {
      if (props.mode === "create") {
        formRef.reset();
      } else if (props.mode === "edit" && props.currentName) {
        inputRef.value = props.currentName;
      }
      dialogRef.showModal();

      requestAnimationFrame(() => {
        inputRef.focus({ preventScroll: true });
      });
    } else {
      dialogRef.close();
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    props.mutation.mutate(name);
  };

  return (
    <>
      {props.children}

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

            <form onSubmit={handleSubmit} ref={formRef}>
              <div class="py-4">
                <input
                  ref={inputRef}
                  name="name"
                  type="text"
                  placeholder="Name"
                  class="input w-full"
                  required
                />
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
                  type="submit"
                  class="btn btn-primary"
                  disabled={props.mutation.isPending}
                >
                  <Show when={props.mutation.isPending}>
                    <span class="loading loading-spinner mr-1 size-4" />
                  </Show>
                  {props.mode === "create" ? "Create" : "Update"}
                </button>
              </div>
            </form>
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
    </>
  );
}
