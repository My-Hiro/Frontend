import { useQuery } from "@tanstack/react-query";
import { storeService } from "@/lib/api/store.service";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await storeService.bootstrap();
      return data.categories;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
