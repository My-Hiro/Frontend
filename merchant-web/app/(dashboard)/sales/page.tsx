'use client';

import { Plus, Search, Eye, Filter, Download, Calendar, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useMerchant } from "@/lib/state/merchantContext";
import { useSales } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SalesPage() {
  const { storeId, formatMoney, formatDateTime } = useMerchant();
  const { sales, isLoading } = useSales(storeId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.customerName?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.customerContact?.includes(q)
    );
  }, [sales, query]);

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case "Cash":
        return <Badge variant="outline" className="font-bold border-green-500/20 bg-green-500/5 text-green-600">Cash</Badge>;
      case "Card":
        return <Badge variant="outline" className="font-bold border-blue-500/20 bg-blue-500/5 text-blue-600">Card</Badge>;
      case "Mobile":
        return <Badge variant="outline" className="font-bold border-amber-500/20 bg-amber-500/5 text-amber-600">Mobile</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales & Transactions</h1>
          <p className="text-sm text-muted-foreground">Track your store revenue and customer purchase history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" /> Last 30 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Sale
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions, customers..."
                className="pl-9 h-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Order ID</TableHead>
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="font-bold">Date & Time</TableHead>
                  <TableHead className="font-bold">Payment</TableHead>
                  <TableHead className="font-bold text-right">Total Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading sales...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sale) => (
                    <TableRow key={sale.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary uppercase">{sale.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{sale.customerName || "Guest Customer"}</span>
                          <span className="text-[10px] text-muted-foreground">{sale.customerContact || "No contact"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(sale.date)}</TableCell>
                      <TableCell>{getPaymentBadge(sale.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-bold">{formatMoney(sale.total)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download Receipt</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Refund Order</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
