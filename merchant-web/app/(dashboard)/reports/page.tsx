'use client';

import { BarChart3, TrendingUp, DollarSign, ShoppingCart, PieChart as PieChartIcon } from "lucide-react";
import { useMerchant } from "@/lib/state/merchantContext";
import { useInventory } from "@/hooks/useInventory";
import { useSales } from "@/hooks/useSales";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function ReportsPage() {
  const { storeId, formatMoney } = useMerchant();
  const { sales = [] } = useSales(storeId);
  const { data: categories = [] } = useCategories();

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Comprehensive insights into your store's performance and growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button size="sm">
            Generate Custom Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-green-500 font-bold mt-1">
              <TrendingUp className="h-3 w-3" /> +14.5% <span className="text-muted-foreground font-normal">from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <div className="flex items-center gap-1 text-xs text-green-500 font-bold mt-1">
              <TrendingUp className="h-3 w-3" /> +8.2% <span className="text-muted-foreground font-normal">from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Avg. Basket</CardTitle>
            <PieChartIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(sales.length > 0 ? totalRevenue / sales.length : 0)}</div>
            <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-1">
              <TrendingDown className="h-3 w-3" /> -2.1% <span className="text-muted-foreground font-normal">from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">Active on Discovery</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="sales" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Sales Performance</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="discovery" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Discovery Reach</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Visualizing your revenue growth over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center border-t">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-10" />
                <p className="text-sm font-medium">Visualizing sales trends...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventory" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Health</CardTitle>
              <CardDescription>Analysis of stock levels and turnover rates.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center border-t">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <PieChartIcon className="h-12 w-12 opacity-10" />
                <p className="text-sm font-medium">Visualizing stock metrics...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="discovery" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discovery Visibility</CardTitle>
                <CardDescription>How often customers find you on the myHiro Discovery app.</CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-none">BETA</Badge>
            </CardHeader>
            <CardContent className="space-y-8 pt-6 border-t">
               <div className="grid gap-8 md:grid-cols-3">
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Impressions</p>
                   <p className="text-3xl font-bold">12,405</p>
                   <p className="text-xs text-muted-foreground">Appearances in search results</p>
                 </div>
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Store Views</p>
                   <p className="text-3xl font-bold">842</p>
                   <p className="text-xs text-muted-foreground">Clicks on your store profile</p>
                 </div>
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CTR</p>
                   <p className="text-3xl font-bold">6.8%</p>
                   <p className="text-xs text-muted-foreground text-green-500 font-bold">High engagement</p>
                 </div>
               </div>
               
               <Separator />
               
               <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg border border-dashed">
                 <p className="text-sm text-muted-foreground">Heatmap data currently being processed...</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Download({ className }: { className?: string }) {
  return <TrendingUp className={className} />; // Placeholder
}

function TrendingDown({ className }: { className?: string }) {
  return <TrendingUp className={className} style={{ transform: 'rotate(180deg)' }} />; // Placeholder
}
