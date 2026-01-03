import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal, Match, Switch } from "solid-js";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";
import ModifyDialog from "../modify-dialog";
import { cn } from "../../lib/utils";

interface AddItemProps {
  store_id?: number;
  section_id?: number;
  mode: "global" | "store" | "section";
}

export default function AddItem(props: AddItemProps) {
  const [open, setOpen] = createSignal(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          store_id: props.store_id,
          section_id: props.section_id,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      setOpen(false);
    },
  }));

  return (
    <ModifyDialog
      title="Add Item"
      mode="create"
      mutation={createMutation}
      open={open}
      setOpen={setOpen}
    >
      <Switch>
        <Match when={props.mode === "global"}>
          <div class="fab bottom-20 sm:bottom-4">
            <button
              class="btn btn-secondary btn-circle btn-lg"
              onClick={() => setOpen(true)}
            >
              <PlusIcon />
            </button>
          </div>
        </Match>

        <Match when={props.mode === "store" || props.mode === "section"}>
          <button
            class={cn(
              "btn btn-soft btn-sm btn-circle",
              props.mode === "store" ? "btn-secondary" : "btn-primary"
            )}
            onClick={() => setOpen(true)}
          >
            <PlusIcon class="size-4" />
          </button>
        </Match>
      </Switch>
    </ModifyDialog>
  );
}
