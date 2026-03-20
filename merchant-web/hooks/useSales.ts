import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/lib/api/sales.service";
import type { Sale } from "@/types";

export function useSales(storeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sales", storeId],
    queryFn: async () => {
      const { storeService } = await import("@/lib/api/store.service");
      const data = await storeService.bootstrap(storeId);
      return data.sales;
    },
    enabled: !!storeId,
  });

  const completeSaleMutation = useMutation({
    mutationFn: (sale: Omit<Sale, "id" | "date">) => salesService.completeSale(storeId, sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", storeId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", storeId] }); // Inventory changes after sale
    },
  });

  return {
    sales: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    completeSale: completeSaleMutation.mutateAsync,
    isMutating: completeSaleMutation.isPending,
  };
}
