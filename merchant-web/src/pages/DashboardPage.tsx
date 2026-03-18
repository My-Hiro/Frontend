import { AlertTriangle, DollarSign, Package, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getCategoryColor } from "../lib/categoryColors";
import { MetricCard } from "../components/shared/MetricCard";
import { useMerchant } from "../state/merchantContext";
import type { Category, InventoryItem, Sale } from "../state/types";

interface Props {
  items: InventoryItem[];
  sales: Sale[];
  categories: Category[];
}

type CategoryRollup = {
  id: string;
  name: string;
  color: string;
  value: number;
  products: number;
  units: number;
};

const shortDay = (date: Date): string =>
  date.toLocaleString("en-GH", { weekday: "short" });

const formatGhc = (value: number): string =>
  `GHC${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const asPercent = (part: number, total: number): string =>
  `${(total > 0 ? (part / total) * 100 : 0).toFixed(1)}%`;

export function DashboardPage({ items, sales, categories }: Props) {
  const { formatMoney } = useMerchant();

  const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0);
  const inventoryValue = items.reduce(
    (acc, item) => acc + item.quantity * item.sellingPrice,
    0
  );
  const alerts = items.filter(
    (item) => item.status === "low-stock" || item.status === "out-of-stock"
  ).length;

  const todaySales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const now = new Date();
    return (
      saleDate.getDate() === now.getDate() &&
      saleDate.getMonth() === now.getMonth() &&
      saleDate.getFullYear() === now.getFullYear()
    );
  });
  const todayRevenue = todaySales.reduce((acc, sale) => acc + sale.total, 0);
  const totalRevenueAllTime = sales.reduce((acc, sale) => acc + sale.total, 0);
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

  const categoryRollup: CategoryRollup[] = categories
    .map((category, index) => {
      const rows = items.filter((item) => {
        const primary = item.placements?.[0];
        const categoryId = primary?.categoryId ?? item.category;
        return categoryId === category.id;
      });
      return {
        id: category.id,
        name: category.name,
        color: getCategoryColor(category.id, category.color, index),
        value: Number(
          rows.reduce((sum, row) => sum + row.quantity * row.sellingPrice, 0).toFixed(2)
        ),
        products: rows.length,
        units: rows.reduce((sum, row) => sum + row.quantity, 0),
        order: index
      } as CategoryRollup & { order: number };
    })
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      const ap = a.id === "more" ? 1 : 0;
      const bp = b.id === "more" ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return a.order - b.order;
    })
    .map(({ order: _order, ...entry }) => entry);

  const totalValue = categoryRollup.reduce((sum, row) => sum + row.value, 0);
  const totalProducts = categoryRollup.reduce((sum, row) => sum + row.products, 0);
  const totalStockUnits = categoryRollup.reduce((sum, row) => sum + row.units, 0);

  const valueData = categoryRollup.map((row) => ({ name: row.name, value: row.value, color: row.color }));
  const productData = categoryRollup.map((row) => ({
    name: row.name,
    value: row.products,
    color: row.color
  }));
  const unitData = categoryRollup.map((row) => ({ name: row.name, value: row.units, color: row.color }));

  const topSelling = useMemo(() => {
    const byName = new Map<string, { name: string; units: number; revenue: number }>();
    for (const sale of sales) {
      for (const line of sale.items) {
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
  }, [sales]);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.status === "low-stock" || item.status === "out-of-stock").slice(0, 5),
    [items]
  );

  const categoryStatsByName = useMemo(
    () => new Map(categoryRollup.map((entry) => [entry.name, entry] as const)),
    [categoryRollup]
  );

  return (
    <div className="page-stack" data-tour="dashboard-overview">
      <div className="metric-grid metric-grid--two-row" data-tour="dashboard-metrics">
        <MetricCard
          label="Total Inventory"
          value={String(totalUnits)}
          hint={`${items.length} products`}
          icon={<Package />}
        />
        <MetricCard
          label="Inventory Value"
          value={formatMoney(inventoryValue)}
          hint="Total stock worth"
          icon={<DollarSign />}
        />
        <MetricCard
          label="Today's Revenue"
          value={formatMoney(todayRevenue)}
          hint={`${todaySales.length} transactions`}
          icon={<ShoppingCart />}
        />
        <MetricCard
          label="Alerts"
          value={String(alerts)}
          hint="Items need attention"
          icon={<AlertTriangle />}
        />
      </div>

      <div className="dashboard-quad">
        <div className="dashboard-col">
          <section className="panel dashboard-panel">
            <div className="panel-head">
              <div>
                <h3>Weekly Revenue</h3>
                <p>Last 7 days performance</p>
              </div>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3257D0" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#3257D0" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf5" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: unknown) =>
                      formatMoney(Number.isFinite(Number(value)) ? Number(value) : 0)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3257D0"
                    strokeWidth={2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel dashboard-panel panel-alerts" data-tour="dashboard-alerts">
            <div className="panel-head">
              <div>
                <h3 className="danger-title">Inventory Alerts</h3>
                <p className="danger-soft">Preview of low stock and out-of-stock items</p>
              </div>
            </div>
            <div className="list-stack">
              {lowStockItems.map((item) => (
                <div key={item.id} className="line-item">
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.sku}</small>
                  </div>
                  <small className={item.status === "out-of-stock" ? "danger-text" : "warning-line"}>
                    {item.quantity} units
                  </small>
                </div>
              ))}
              {lowStockItems.length === 0 && <small className="muted">No active alerts.</small>}
            </div>
          </section>

          <section className="panel dashboard-panel panel-top-selling" data-tour="dashboard-top-selling">
            <div className="panel-head">
              <div>
                <h3 className="info-title">Top Selling Products</h3>
                <p className="info-soft">Based on recent transaction volume and revenue</p>
              </div>
            </div>
            <div className="list-stack">
              {topSelling.map((entry, index) => (
                <div key={entry.name} className="line-item">
                  <div>
                    <strong className="rank-text">
                      #{index + 1} {entry.name}
                    </strong>
                    <small>{entry.units} units sold</small>
                  </div>
                  <small className="info-text">{formatMoney(entry.revenue)}</small>
                </div>
              ))}
              {topSelling.length === 0 && <small className="muted">No sales yet.</small>}
            </div>
          </section>
        </div>

        <div className="dashboard-col">
          <section className="panel dashboard-panel">
            <div className="panel-head">
              <div>
                <h3>Inventory by Category</h3>
                <p>Value, product count, and stock units by category</p>
              </div>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const hoveredName = String(payload[0]?.payload?.name ?? "");
                      const row = categoryStatsByName.get(hoveredName);
                      if (!row) return null;
                      return (
                        <div className="chart-tooltip">
                          <p>{row.name}</p>
                          <small>{`Inventory value: ${formatGhc(row.value)} (${asPercent(row.value, totalValue)})`}</small>
                          <small>{`Product count: ${row.products} (${asPercent(row.products, totalProducts)})`}</small>
                          <small>{`Stock units: ${row.units} (${asPercent(row.units, totalStockUnits)})`}</small>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={valueData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={88}
                    outerRadius={112}
                    paddingAngle={1}
                  >
                    {valueData.map((entry) => (
                      <Cell key={`value-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Pie
                    data={productData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={84}
                    paddingAngle={1}
                  >
                    {productData.map((entry) => (
                      <Cell key={`products-${entry.name}`} fill={entry.color} fillOpacity={0.75} />
                    ))}
                  </Pie>
                  <Pie
                    data={unitData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={1}
                  >
                    {unitData.map((entry) => (
                      <Cell key={`units-${entry.name}`} fill={entry.color} fillOpacity={0.5} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="list-stack">
              {categoryRollup.map((row) => (
                <div className="line-item" key={row.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        background: row.color
                      }}
                    />
                    <strong>{row.name}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <small>{`Inventory value: ${formatGhc(row.value)} (${asPercent(row.value, totalValue)})`}</small>
                    <small>{`Product count: ${row.products} (${asPercent(row.products, totalProducts)})`}</small>
                    <small>{`Stock units: ${row.units} (${asPercent(row.units, totalStockUnits)})`}</small>
                  </div>
                </div>
              ))}
              <div className="line-item">
                <strong>Total</strong>
                <small>
                  {formatGhc(totalValue)} | {totalProducts} products | {totalStockUnits} units
                </small>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="card-grid three dashboard-summary-grid">
        <article
          className="stat-card dashboard-summary-card"
          style={{ background: "linear-gradient(135deg, #2f6fed, #2355bf)", color: "#fff" }}
        >
          <h4>Total Products</h4>
          <strong className="dashboard-summary-value">{items.length}</strong>
          <small className="dashboard-summary-note">
            Across {categoryRollup.filter((row) => row.products > 0).length} categories
          </small>
        </article>
        <article
          className="stat-card dashboard-summary-card"
          style={{ background: "linear-gradient(135deg, #07b24a, #059a40)", color: "#fff" }}
        >
          <h4>Total Revenue (All Time)</h4>
          <strong className="dashboard-summary-value">{formatMoney(totalRevenueAllTime)}</strong>
          <small className="dashboard-summary-note">{sales.length} transactions</small>
        </article>
        <article
          className="stat-card dashboard-summary-card"
          style={{ background: "linear-gradient(135deg, #8f35f4, #6a1fc7)", color: "#fff" }}
        >
          <h4>Average Order Value</h4>
          <strong className="dashboard-summary-value">{formatMoney(averageOrderValue)}</strong>
          <small className="dashboard-summary-note">Per transaction</small>
        </article>
      </div>
    </div>
  );
}
