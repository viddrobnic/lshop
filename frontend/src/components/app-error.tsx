import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AppErrorProps = {
  error?: unknown;
  message?: string;
  className?: string;
};

export function AppError({
  error,
  message = "Something went wrong. Please try again.",
  className,
}: AppErrorProps) {
  const description =
    error instanceof Error && error.message ? error.message : message;

  return (
    <Alert variant="destructive" className={cn("mx-4 w-auto", className)}>
      <CircleAlertIcon />
      <AlertTitle>Unable to complete request</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
