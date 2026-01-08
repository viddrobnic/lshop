import { useMutation, useQueryClient } from "@tanstack/solid-query";
import {
  Accessor,
  createContext,
  createEffect,
  ParentComponent,
  Show,
  useContext,
} from "solid-js";
import { apiFetch } from "../../api";
import { showErrorToast } from "../toast/error-toast";
import { Portal } from "solid-js/web";
import { createStore } from "solid-js/store";

export type AddItemDialogState = {
  store_id?: number;
  section_id?: number;
  open: boolean;
};

export type AddItemContextValue = {
  state: Accessor<AddItemDialogState>;
  setClosed: () => void;
  setOpen: (args: { store_id?: number; section_id?: number }) => void;
};

const AddItemContext = createContext<AddItemContextValue>();

export const useAddItem = () => {
  const context = useContext(AddItemContext);
  if (!context) {
    throw new Error("useAddItem must be used within AddItemProvider");
  }

  return context;
};

export const AddItemProvider: ParentComponent = (props) => {
  const [store, setStore] = createStore<AddItemDialogState>({ open: false });

  const state = () => store;
  const setOpen = (args: { store_id?: number; section_id?: number }) => {
    setStore({
      store_id: args.store_id,
      section_id: args.section_id,
      open: true,
    });
  };
  const setClosed = () => {
    setStore("open", false);
  };

  return (
    <AddItemContext.Provider
      value={{
        state,
        setOpen,
        setClosed,
      }}
    >
      {props.children}
      <Dialog />
    </AddItemContext.Provider>
  );
};

function Dialog() {
  let dialogRef!: HTMLDialogElement;
  let formRef!: HTMLFormElement;
  let inputRef!: HTMLInputElement;

  const { state, setClosed } = useAddItem();

  createEffect(() => {
    if (state().open) {
      formRef.reset();
      dialogRef.showModal();

      requestAnimationFrame(() => {
        inputRef.focus({ preventScroll: true });
      });
    } else {
      dialogRef.close();
    }
  });

  const queryClient = useQueryClient();
  const createMutation = useMutation(() => ({
    mutationFn: async ({ name }: { name: string; addAnother: boolean }) =>
      apiFetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          store_id: state().store_id,
          section_id: state().section_id,
        }),
      }),
    onSuccess: async (_data, { addAnother }) => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      if (addAnother) {
        formRef.reset();
        requestAnimationFrame(() => {
          inputRef.focus({ preventScroll: true });
        });
      } else {
        setClosed();
      }
    },
    onError: () => showErrorToast("Failed to add item"),
  }));

  const handleSubmit = (addAnother: boolean = false) => {
    if (!formRef.checkValidity()) {
      formRef.reportValidity();
      return;
    }

    const formData = new FormData(formRef);
    const name = formData.get("name") as string;
    createMutation.mutate({ name, addAnother });
  };

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class="modal modal-bottom sm:modal-middle"
        onClose={() => setClosed()}
      >
        <div class="modal-box">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => setClosed()}
          >
            ✕
          </button>
          <h3 class="text-lg font-bold">Add Item</h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(true);
            }}
            ref={formRef}
          >
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

            <div class="modal-action justify-between">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => setClosed()}
              >
                Cancel
              </button>

              <div class="flex gap-2">
                <button
                  type="button"
                  class="btn btn-primary"
                  disabled={createMutation.isPending}
                  onClick={() => handleSubmit(false)}
                >
                  <Show when={createMutation.isPending}>
                    <span class="loading loading-spinner mr-1 size-4" />
                  </Show>
                  Create
                </button>
                <button
                  type="button"
                  class="btn btn-accent"
                  disabled={createMutation.isPending}
                  onClick={() => handleSubmit(true)}
                >
                  <Show when={createMutation.isPending}>
                    <span class="loading loading-spinner mr-1 size-4" />
                  </Show>
                  Create & Add Another
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-backdrop">
          <button
            onClick={(e) => {
              e.preventDefault();
              setClosed();
            }}
          >
            close
          </button>
        </div>
      </dialog>
    </Portal>
  );
}
