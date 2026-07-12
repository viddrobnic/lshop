import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, InfoIcon } from "lucide-react";

import { apiFetch } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { StoreItem } from "@/components/stores/store-item";
import {
  AddStoreDialog,
  DeleteStoreDialog,
  EditStoreDialog,
} from "@/components/stores/store-dialogs";
import { queryKeys } from "@/data/query-keys";
import type { Store } from "@/data/stores";

export function StoresPage() {
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const stores = useQuery({
    queryKey: queryKeys.stores.all,
    queryFn: () => apiFetch<Store[]>("/stores"),
  });

  return (
    <>
      <div className="flex items-center justify-between px-4">
        <h1 className="text-primary text-3xl font-bold">Stores</h1>
        <AddStoreDialog />
      </div>
      <EditStoreDialog
        store={editingStore}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStore(null);
          }
        }}
      />
      <DeleteStoreDialog
        store={deletingStore}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingStore(null);
          }
        }}
      />
      {stores.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 px-4 pt-4 text-sm">
          <Spinner /> Loading...
        </div>
      ) : null}
      {stores.isError ? (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>Error: {stores.error.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {stores.data?.length === 0 ? (
        <div className="px-4 pt-4">
          <Alert>
            <InfoIcon />
            <AlertDescription>No data yet</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {stores.data && stores.data.length > 0 ? (
        <div className="flex flex-col gap-2 px-4 pt-4">
          {stores.data.map((store) => (
            <StoreItem
              key={store.id}
              store={store}
              onEdit={() => {
                setEditingStore(store);
              }}
              onDelete={() => {
                setDeletingStore(store);
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
