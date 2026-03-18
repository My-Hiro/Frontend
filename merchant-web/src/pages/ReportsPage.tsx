import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getCategoryColor } from "../lib/categoryColors";
import { merchantApi } from "../state/api";
import { useMerchant } from "../state/merchantContext";
import type { Category, DiscoveryReportSnapshot, InventoryItem, Sale } from "../state/types";

interface Props {
  items: InventoryItem[];
  sales: Sale[];
  categories: Category[];
  discovery: DiscoveryReportSnapshot;
}

const valueTrend = [
  { month: "Jan", value: 12500 },
  { month: "Feb", value: 14200 },
  { month: "Mar", value: 13800 },
  { month: "Apr", value: 15600 },
  { month: "May", value: 16800 },
  { month: "Jun", value: 18200 }
];

const formatGhc = (value: number): string =>
  `GHC${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const TrendTooltip = ({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ value?: unknown }>;
}) => {
  if (!active || !payload?.length) {
    return null;
  }
  const numeric = Number(payload[0]?.value ?? 0);
  return (
    <div className="chart-tooltip">
      <small>{`Inventory value: ${formatGhc(Number.isFinite(numeric) ? numeric : 0)}`}</small>
    </div>
  );
};

export function ReportsPage({ items, sales, categories, discovery }: Props) {
  const { formatMoney, storeId, locale } = useMerchant();
  const [range, setRange] = useState("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [toast, setToast] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [inventoryTrendHover, setInventoryTrendHover] = useState<number | null>(null);
  const totalRevenue = sales.reduce((sum, row) => sum + row.total, 0);
  const inventoryValue = items.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const potentialProfit = items.reduce(
    (sum, row) => sum + row.quantity * (row.sellingPrice - row.costPrice),
    0
  );
  const margin = potentialProfit <= 0 ? 0 : (potentialProfit / (potentialProfit + inventoryValue)) * 100;

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name] as const)),
    [categories]
  );

  const salesTrend = useMemo(() => {
    const itemById = new Map(items.map((item) => [item.id, item] as const));
    const itemByName = new Map(items.map((item) => [item.name, item] as const));

    const now = new Date();
    const months: Array<{ key: string; label: string; revenue: number; profit: number }> = [];
    for (let back = 5; back >= 0; back -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(locale || "en", { month: "short" });
      months.push({ key, label, revenue: 0, profit: 0 });
    }

    const bucketByKey = new Map(months.map((row) => [row.key, row] as const));
    for (const sale of sales) {
      const ms = new Date(sale.date).getTime();
      if (!Number.isFinite(ms)) continue;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;

      bucket.revenue += sale.total;
      for (const line of sale.items) {
        const item = itemById.get(line.itemId) ?? itemByName.get(line.itemName);
        const cost = item?.costPrice ?? 0;
        bucket.profit += (line.price - cost) * line.quantity;
      }
    }

    return months.map((row) => ({
      month: row.label,
      revenue: Number(row.revenue.toFixed(2)),
      profit: Number(row.profit.toFixed(2))
    }));
  }, [items, sales, locale]);

  const exportReports = async () => {
    if (range === "custom" && (!customStart || !customEnd)) {
      setToast("Select both custom start and end dates.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    setExportBusy(true);
    try {
      const csv = await merchantApi.exportReportsCsv(storeId, {
        range,
        start: range === "custom" ? customStart : undefined,
        end: range === "custom" ? customEnd : undefined
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast("Report exported");
      setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Export failed (API unavailable)");
      setTimeout(() => setToast(""), 2800);
    } finally {
      setExportBusy(false);
    }
  };

  const categoryData = useMemo(
    () =>
      (() => {
        const orderIndex = new Map(categories.map((category, index) => [category.id, index] as const));
        const itemById = new Map(items.map((item) => [item.id, item] as const));
        const itemByName = new Map(items.map((item) => [item.name, item] as const));
        const revenueByCategoryId = new Map<string, number>();

        for (const sale of sales) {
          for (const line of sale.items) {
            const item = itemById.get(line.itemId) ?? itemByName.get(line.itemName);
            if (!item) {
              continue;
            }
            const primary = item.placements?.[0];
            const categoryId = primary?.categoryId ?? item.category;
            const revenue = line.quantity * line.price;
            revenueByCategoryId.set(categoryId, (revenueByCategoryId.get(categoryId) ?? 0) + revenue);
          }
        }

        return categories
          .map((category) => ({
            id: category.id,
            name: category.name,
            revenue: revenueByCategoryId.get(category.id) ?? 0,
            color: getCategoryColor(category.id, category.color, orderIndex.get(category.id) ?? 0)
          }))
          .sort((a, b) => {
            if (b.revenue !== a.revenue) {
              return b.revenue - a.revenue;
            }
            const ap = a.id === "more" ? 1 : 0;
            const bp = b.id === "more" ? 1 : 0;
            if (ap !== bp) {
              return ap - bp;
            }
            return (orderIndex.get(a.id) ?? 9999) - (orderIndex.get(b.id) ?? 9999);
          });
      })(),
    [categories, items, sales]
  );

  const totalCategoryRevenue = useMemo(
    () => categoryData.reduce((sum, row) => sum + row.revenue, 0),
    [categoryData]
  );

  const topProducts = useMemo(
    () => {
      const itemById = new Map(items.map((item) => [item.id, item] as const));
      const rows = new Map<
        string,
        { id: string; name: string; category: string; units: number; revenue: number; profit: number }
      >();

      for (const sale of sales) {
        for (const line of sale.items) {
          const item = itemById.get(line.itemId);
          const key = line.itemId || line.itemName;
          const existing =
            rows.get(key) ??
            {
              id: key,
              name: line.itemName,
              category:
                item
                  ? categoryNameById.get(item.placements?.[0]?.categoryId ?? item.category) ??
                    (item.placements?.[0]?.categoryId ?? item.category)
                  : "General",
              units: 0,
              revenue: 0,
              profit: 0
            };
          const revenue = line.lineTotal ?? line.quantity * line.price;
          const cost = item?.costPrice ?? 0;
          existing.units += line.quantity;
          existing.revenue += revenue;
          existing.profit += revenue - cost * line.quantity;
          rows.set(key, existing);
        }
      }

      return Array.from(rows.values())
        .map((row) => ({
          ...row,
          margin: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    [items, sales, categoryNameById]
  );

  const topProductsRevenueTotal = useMemo(
    () => topProducts.reduce((sum, row) => sum + row.revenue, 0),
    [topProducts]
  );

  const topProductsProfitTotal = useMemo(
    () => topProducts.reduce((sum, row) => sum + row.profit, 0),
    [topProducts]
  );
  const maxCategoryRevenue = useMemo(
    () => categoryData.reduce((max, row) => Math.max(max, row.revenue), 0),
    [categoryData]
  );

  return (
    <div className="page-stack">
      {toast && <div className="toast">{toast}</div>}
      <div className="toolbar-row">
        <div>
          <h3>Reports</h3>
          <p>Store-level inventory, sales, and discovery performance</p>
        </div>
        <div className="inline-actions" data-tour="reports-range">
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
          {range === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                aria-label="Custom start date"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                aria-label="Custom end date"
              />
            </>
          )}
          <button
            className="btn btn-primary"
            onClick={() => void exportReports()}
            disabled={exportBusy}
            data-tour="reports-export"
          >
            <Download size={16} /> {exportBusy ? "Exporting..." : "Export Reports"}
          </button>
        </div>
      </div>

      <div className="metric-grid metric-grid--two-row" data-tour="reports-kpis">
        <section className="metric-card report-kpi report-kpi-revenue">
          <p>Total Revenue</p>
          <h3 className="report-kpi-value">{formatGhc(totalRevenue)}</h3>
          <small className="report-kpi-delta positive">(+12.5%) from last period</small>
        </section>
        <section className="metric-card report-kpi report-kpi-inventory">
          <p>Inventory Value</p>
          <h3 className="report-kpi-value">{formatGhc(inventoryValue)}</h3>
          <small className="report-kpi-delta positive">(+8.2%) from last period</small>
        </section>
        <section className="metric-card report-kpi report-kpi-profit">
          <p>Potential Profit</p>
          <h3 className="report-kpi-value">{formatGhc(potentialProfit)}</h3>
          <small className="report-kpi-delta positive">(+15.3%) from last period</small>
        </section>
        <section className="metric-card report-kpi report-kpi-margin">
          <p>Profit Margin</p>
          <h3 className="report-kpi-value">{`${margin.toFixed(1)}%`}</h3>
          <small className="report-kpi-delta negative">(-2.1%) from last period</small>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Inventory Value Trend</h3>
              <p>{`Inventory value: ${formatGhc(inventoryTrendHover ?? inventoryValue)}`}</p>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={valueTrend}
                onMouseMove={(state: { activePayload?: Array<{ value?: unknown }> }) => {
                  const value = state.activePayload?.[0]?.value;
                  const numeric = typeof value === "number" ? value : Number(value);
                  if (Number.isFinite(numeric)) {
                    setInventoryTrendHover(numeric);
                  }
                }}
                onMouseLeave={() => setInventoryTrendHover(null)}
              >
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  content={<TrendTooltip />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3257D0"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel" data-tour="reports-discovery-signals">
          <div className="panel-head">
            <div>
              <h3>Sales & Revenue Trend</h3>
              <p>Revenue and profit trend</p>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: unknown) => {
                    const num = typeof value === "number" ? value : Number(value);
                    return formatMoney(Number.isFinite(num) ? num : 0);
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16A34A"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Category Performance</h3>
              <p>Revenue by category (horizontal lanes)</p>
            </div>
          </div>
          <div className="list-stack">
            {categoryData.map((entry) => {
              const width = maxCategoryRevenue > 0 ? (entry.revenue / maxCategoryRevenue) * 100 : 0;
              const pct = totalCategoryRevenue > 0 ? (entry.revenue / totalCategoryRevenue) * 100 : 0;
              return (
                <div key={entry.id} className="performance-row">
                  <div className="line-item">
                    <span>{entry.name}</span>
                    <strong>{`${formatMoney(entry.revenue)} (${pct.toFixed(1)}%)`}</strong>
                  </div>
                  <div className="performance-track">
                    <span
                      className="performance-bar"
                      style={{ width: `${width}%`, background: entry.color || "#3257D0" }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryData.length === 0 && (
              <p className="muted">No purchases yet. Complete a sale to see category performance.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Discovery Page Signals</h3>
              <p>How shoppers interact with your store page</p>
            </div>
          </div>
          <div className="list-stack">
            <div className="line-item">
              <span>Views</span>
              <strong>{discovery.views}</strong>
            </div>
            <div className="line-item">
              <span>Calls</span>
              <strong>{discovery.calls}</strong>
            </div>
            <div className="line-item">
              <span>Directions</span>
              <strong>{discovery.directions}</strong>
            </div>
            <div className="line-item">
              <span>Saves</span>
              <strong>{discovery.saves}</strong>
            </div>
            <div className="line-item">
              <span>Requests</span>
              <strong>{discovery.requests}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Top Performing Products</h3>
            <p>By revenue and profit contribution</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th>Category</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((item, index) => (
                <tr key={item.id}>
                  <td>#{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.units}</td>
                  <td>
                    {`${formatMoney(item.revenue)} (${(
                      topProductsRevenueTotal > 0
                        ? (item.revenue / topProductsRevenueTotal) * 100
                        : 0
                    ).toFixed(1)}%)`}
                  </td>
                  <td>
                    {`${formatMoney(item.profit)} (${(
                      topProductsProfitTotal > 0
                        ? (item.profit / topProductsProfitTotal) * 100
                        : 0
                    ).toFixed(1)}%)`}
                  </td>
                  <td>{item.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Download Reports</h3>
            <p>Export inventory, sales, or restock reports</p>
          </div>
        </div>
        <div className="card-grid three">
          <article className="stat-card">
            <h4>Inventory Report</h4>
            <p className="muted">Complete stock levels and valuations.</p>
            <button className="btn btn-outline" onClick={() => void exportReports()}>
              Export Inventory
            </button>
          </article>
          <article className="stat-card">
            <h4>Sales Report</h4>
            <p className="muted">Transaction history and revenue summary.</p>
            <button className="btn btn-outline" onClick={() => void exportReports()}>
              Export Sales
            </button>
          </article>
          <article className="stat-card">
            <h4>Restock Report</h4>
            <p className="muted">Low stock items and reorder recommendations.</p>
            <button className="btn btn-outline" onClick={() => void exportReports()}>
              Export Restock
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
