'use client';

import { AlertTriangle, DollarSign, Package, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useMerchant } from "@/lib/state/merchantContext";
import { useInventory } from "@/hooks/useInventory";
import { useSales } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, Sale, SaleLine } from "@/types";

const shortDay = (date: Date): string =>
  date.toLocaleString("en-GH", { weekday: "short" });

export default function DashboardPage() {
  const { storeId, formatMoney } = useMerchant();
  const { data: items = [] } = useInventory(storeId) as { data: InventoryItem[] };
  const { sales = [] } = useSales(storeId) as { sales: Sale[] };

  const stats = useMemo(() => {
    const totalUnits = items.reduce((acc: number, item: InventoryItem) => acc + item.quantity, 0);
    const inventoryValue = items.reduce(
      (acc: number, item: InventoryItem) => acc + item.quantity * item.sellingPrice,
      0
    );
    const alerts = items.filter(
      (item: InventoryItem) => item.status === "low-stock" || item.status === "out-of-stock"
    ).length;

    const todaySales = sales.filter((sale: Sale) => {
      const saleDate = new Date(sale.date);
      const now = new Date();
      return (
        saleDate.getDate() === now.getDate() &&
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    });
    const todayRevenue = todaySales.reduce((acc: number, sale: Sale) => acc + sale.total, 0);
    const totalRevenueAllTime = sales.reduce((acc: number, sale: Sale) => acc + sale.total, 0);
    const averageOrderValue = sales.length > 0 ? totalRevenueAllTime / sales.length : 0;

    const revenueTrend = (() => {
      const now = new Date();
      const rows = Array.from({ length: 7 }).map((_, idx) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - idx));
        const key = date.toISOString().slice(0, 10);
        return {
          key,
          day: shortDay(date),
          revenue: 0
        };
      });
      const bucket = new Map(rows.map((row) => [row.key, row] as const));
      for (const sale of sales) {
        const key = new Date(sale.date).toISOString().slice(0, 10);
        const row = bucket.get(key);
        if (row) {
          row.revenue += sale.total;
        }
      }
      return rows.map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }));
    })();

    const lowStockItems = items
      .filter((item: InventoryItem) => item.status === "low-stock" || item.status === "out-of-stock")
      .slice(0, 5);

    const topSelling = (() => {
      const byName = new Map<string, { name: string; units: number; revenue: number }>();
      for (const sale of sales) {
        for (const line of sale.items as SaleLine[]) {
          const row = byName.get(line.itemName) ?? { name: line.itemName, units: 0, revenue: 0 };
          row.units += line.quantity;
          row.revenue += line.lineTotal ?? line.quantity * line.price;
          byName.set(line.itemName, row);
        }
      }
      return Array.from(byName.values())
        .sort((a, b) => {
          if (b.revenue !== a.revenue) return b.revenue - a.revenue;
          return b.units - a.units;
        })
        .slice(0, 5);
    })();

    return {
      totalUnits,
      inventoryValue,
      alerts,
      todayRevenue,
      todaySalesCount: todaySales.length,
      totalRevenueAllTime,
      averageOrderValue,
      revenueTrend,
      lowStockItems,
      topSelling
    };
  }, [items, sales]);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnits}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.inventoryValue)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Total assets worth</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Today's Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              <span className="text-primary font-bold mr-1">{stats.todaySalesCount}</span>
              transactions today
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.alerts}</div>
            <p className="text-xs text-destructive/70 font-medium mt-1">Items need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Sales performance for the last 7 days</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8">
              View Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pl-2">
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueTrend}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(val) => `GH\u20B5${val}`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: unknown) =>
                      formatMoney(Number.isFinite(Number(value)) ? Number(value) : 0)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#revFill)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Inventory Alerts
              </CardTitle>
              <CardDescription>Stock levels requiring immediate restock</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px]">
                <div className="space-y-4">
                  {stats.lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between group">
                      <div className="space-y-1">
                        <p className="text-sm font-bold leading-none group-hover:text-primary transition-colors cursor-pointer">{item.name}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{item.sku}</p>
                      </div>
                      <Badge variant={item.status === "out-of-stock" ? "destructive" : "outline"} className="font-bold">
                        {item.quantity} {item.unit}
                      </Badge>
                    </div>
                  ))}
                  {stats.lowStockItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs font-medium">All stock levels are healthy</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
