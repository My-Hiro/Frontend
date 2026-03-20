'use client';

import { Mail, MessageCircle, Phone, Plus, Star, MoreHorizontal, MapPin, ExternalLink, Trash2 } from "lucide-react";
import { useMerchant } from "@/lib/state/merchantContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useInventory } from "@/hooks/useInventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SuppliersPage() {
  const { storeId, formatMoney } = useMerchant();
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers(storeId);
  const { data: items = [] } = useInventory(storeId);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Management</h1>
          <p className="text-sm text-muted-foreground">Manage your supply chain and restock products efficiently.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loadingSuppliers ? (
          <p>Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p>No suppliers found.</p>
        ) : (
          suppliers.map((supplier) => {
            const rows = items.filter((item) => item.supplier === supplier.name);
            const inventoryCost = rows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
            const lowStock = rows.filter(
              (row) => row.status === "low-stock" || row.status === "out-of-stock"
            ).length;

            return (
              <Card key={supplier.id} className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{supplier.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <CardTitle className="text-base">{supplier.name}</CardTitle>
                        <CardDescription className="text-xs">{supplier.contact}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <Star className="h-3 w-3 fill-current" /> {supplier.rating}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {supplier.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {supplier.phone}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{supplier.address}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Inventory Cost</p>
                      <p className="text-sm font-bold">{formatMoney(inventoryCost)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Low Stock</p>
                      <p className={cn("text-sm font-bold", lowStock > 0 ? "text-destructive" : "text-green-500")}>
                        {lowStock} items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" className="flex-1 text-xs h-9">
                      <MessageCircle className="mr-2 h-3.5 w-3.5" /> Request
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Phone className="mr-2 h-4 w-4" /> Call Supplier</DropdownMenuItem>
                        <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> Send Email</DropdownMenuItem>
                        <DropdownMenuItem><ExternalLink className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
