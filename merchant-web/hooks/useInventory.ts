import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/lib/api/inventory.service";
import type { InventoryItem } from "@/types";

export function useInventory(storeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory", storeId],
    queryFn: () => inventoryService.listInventory(storeId),
    enabled: !!storeId,
  });

  const upsertMutation = useMutation({
    mutationFn: (item: InventoryItem) => inventoryService.upsertItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", storeId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => inventoryService.deleteItem(storeId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", storeId] });
    },
  });

  return {
    ...query,
    upsertItem: upsertMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    isMutating: upsertMutation.isPending || deleteMutation.isPending,
  };
}
