import { createContext, useContext } from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const ResponsiveDialogContext = createContext(false);

function ResponsiveDialog({ ...props }: React.ComponentProps<typeof Dialog>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <ResponsiveDialogContext.Provider value={isDesktop}>
      {isDesktop ? <Dialog {...props} /> : <Drawer {...props} />}
    </ResponsiveDialogContext.Provider>
  );
}

function ResponsiveDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isDesktop = useContext(ResponsiveDialogContext);

  return isDesktop ? (
    <DialogContent className={className} {...props} />
  ) : (
    <DrawerContent
      className={cn("pb-[env(safe-area-inset-bottom)]", className)}
      {...props}
    />
  );
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isDesktop = useContext(ResponsiveDialogContext);

  return isDesktop ? (
    <DialogHeader className={className} {...props} />
  ) : (
    <DrawerHeader className={cn("text-left", className)} {...props} />
  );
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isDesktop = useContext(ResponsiveDialogContext);

  return isDesktop ? (
    <DialogFooter className={className} {...props} />
  ) : (
    <DrawerFooter
      className={cn("flex-row flex-wrap justify-between", className)}
      {...props}
    />
  );
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isDesktop = useContext(ResponsiveDialogContext);

  return isDesktop ? (
    <DialogTitle className={className} {...props} />
  ) : (
    <DrawerTitle className={className} {...props} />
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
};
