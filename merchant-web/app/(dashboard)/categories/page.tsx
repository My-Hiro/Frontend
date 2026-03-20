'use client';

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getCategoryColor } from "@/lib/categoryColors";
import { useMerchant } from "@/lib/state/merchantContext";
import { useInventory } from "@/hooks/useInventory";
import { useSales } from "@/hooks/useSales";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryStat, InventoryItem, Category, Sale, SaleLine } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function CategoriesPage() {
  const { storeId, formatMoney } = useMerchant();
  const { data: items = [] } = useInventory(storeId);
  const { sales = [] } = useSales(storeId) as { sales: Sale[] };
  const { data: categories = [] } = useCategories();

  const categoryStats = useMemo(() => {
    const orderIndex = new Map(categories.map((entry: Category, index: number) => [entry.id, index] as const));
    const itemById = new Map(items.map((item: InventoryItem) => [item.id, item] as const));
    const itemByName = new Map(items.map((item: InventoryItem) => [item.name, item] as const));
    const salesByCategory = new Map<string, { units: number; revenue: number }>();

    for (const sale of sales) {
      for (const line of sale.items as SaleLine[]) {
        const item = itemById.get(line.itemId) ?? itemByName.get(line.itemName);
        if (!item) continue;
        const categoryId = item.placements?.[0]?.categoryId ?? item.category;
        const revenue = line.lineTotal ?? line.quantity * line.price;
        const current = salesByCategory.get(categoryId) ?? { units: 0, revenue: 0 };
        salesByCategory.set(categoryId, {
          units: current.units + line.quantity,
          revenue: Number((current.revenue + revenue).toFixed(2))
        });
      }
    }

    return categories
      .map((category: Category) => {
        const rows = items.filter((item: InventoryItem) => {
          const categoryId = item.placements?.[0]?.categoryId ?? item.category;
          return categoryId === category.id;
        });
        const salesStat = salesByCategory.get(category.id) ?? { units: 0, revenue: 0 };
        return {
          id: category.id,
          name: category.name,
          color: getCategoryColor(category.id, category.color, orderIndex.get(category.id) ?? 0),
          subcategories: category.subcategories,
          totalValue: Number(
            rows.reduce((sum: number, row: InventoryItem) => sum + row.quantity * row.sellingPrice, 0).toFixed(2)
          ),
          totalUnits: rows.reduce((sum: number, row: InventoryItem) => sum + row.quantity, 0),
          productsCount: rows.length,
          soldUnits: salesStat.units,
          salesRevenue: salesStat.revenue,
          lowStock: rows.filter((row: InventoryItem) => row.status !== "in-stock").length,
          order: orderIndex.get(category.id) ?? 9999
        } satisfies CategoryStat;
      })
      .sort((a: CategoryStat, b: CategoryStat) => {
        if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
        return a.order - b.order;
      });
  }, [categories, items, sales]);

  const maxPerformance = useMemo(
    () =>
      categoryStats.reduce((max: number, row: CategoryStat) => {
        const score = row.salesRevenue > 0 ? row.salesRevenue : row.totalValue;
        return Math.max(max, score);
      }, 0),
    [categoryStats]
  );

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Inventory by Category</h1>
        <p className="text-sm text-muted-foreground">Detailed breakdown of stock and sales performance across categories.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Value, product count, and units per category</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                  />
                  <Pie 
                    data={categoryStats.map((s: CategoryStat) => ({ name: s.name, value: s.totalValue, color: s.color }))} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={80} 
                    outerRadius={110}
                  >
                    {categoryStats.map((entry: CategoryStat) => (
                      <Cell key={`value-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Pie 
                    data={categoryStats.map((s: CategoryStat) => ({ name: s.name, value: s.productsCount, color: s.color }))} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={75}
                  >
                    {categoryStats.map((entry: CategoryStat) => (
                      <Cell key={`products-${entry.name}`} fill={entry.color} fillOpacity={0.7} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {categoryStats.slice(0, 6).map((s: CategoryStat) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Sales Performance</CardTitle>
            <CardDescription>Comparison of revenue generated by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[340px] pr-4">
              <div className="flex flex-col gap-6">
                {categoryStats.map((category: CategoryStat) => {
                  const score = category.salesRevenue > 0 ? category.salesRevenue : category.totalValue;
                  const width = maxPerformance > 0 ? (score / maxPerformance) * 100 : 0;
                  return (
                    <div key={`performance-${category.id}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">{category.name}</span>
                        <span className="font-mono font-bold text-primary">{formatMoney(score)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out rounded-full"
                          style={{ width: `${width}%`, backgroundColor: category.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoryStats.map((category: CategoryStat) => (
          <Card key={category.id} className="group overflow-hidden border-t-4" style={{ borderTopColor: category.color }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="outline" className="font-bold">{category.productsCount} products</Badge>
              </div>
              <CardDescription className="flex flex-wrap gap-1 pt-1">
                {category.subcategories.slice(0, 3).map((sub: string) => (
                  <Badge key={sub} variant="secondary" className="text-[10px] h-5 py-0 px-1.5 font-medium">{sub}</Badge>
                ))}
                {category.subcategories.length > 3 && <Badge variant="secondary" className="text-[10px] h-5 py-0 px-1.5 font-medium">+{category.subcategories.length - 3}</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Inventory Value</span>
                <span className="font-bold">{formatMoney(category.totalValue)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Stock Units</span>
                <span className="font-bold">{category.totalUnits}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Revenue</span>
                <span className="font-bold text-primary">{formatMoney(category.salesRevenue)}</span>
              </div>
              {category.lowStock > 0 && (
                <div className="flex items-center justify-between text-xs p-1.5 bg-destructive/5 rounded border border-destructive/10">
                  <span className="text-destructive font-bold uppercase tracking-widest">Low Stock Alert</span>
                  <span className="font-bold text-destructive">{category.lowStock} items</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
