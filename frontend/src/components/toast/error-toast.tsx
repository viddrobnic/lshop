import { TriangleAlertIcon, XIcon } from "lucide-solid";
import toast from "solid-toast";

type ErrorToastProps = {
  message: string;
  onClose: () => void;
};

function ErrorToast(props: ErrorToastProps) {
  return (
    <div class="alert alert-error border-error/20 bg-base-100 rounded-box pointer-events-auto w-80 border shadow-lg">
      <TriangleAlertIcon class="size-5" />
      <span class="text-sm font-semibold">{props.message}</span>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        aria-label="Dismiss error"
        onClick={() => props.onClose()}
      >
        <XIcon class="size-4" />
      </button>
    </div>
  );
}

export function showErrorToast(message: string) {
  toast.custom(
    (t) => <ErrorToast message={message} onClose={() => toast.dismiss(t.id)} />,
    {
      duration: 6000,
      unmountDelay: 0,
    }
  );
}
