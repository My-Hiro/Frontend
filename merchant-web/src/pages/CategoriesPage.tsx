import { useMemo, type CSSProperties } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getCategoryColor } from "../lib/categoryColors";
import { useMerchant } from "../state/merchantContext";
import type { Category, InventoryItem, Sale } from "../state/types";

interface Props {
  categories: Category[];
  items: InventoryItem[];
  sales: Sale[];
}

type CategoryStat = {
  id: string;
  name: string;
  color: string;
  subcategories: string[];
  totalValue: number;
  totalUnits: number;
  productsCount: number;
  soldUnits: number;
  salesRevenue: number;
  lowStock: number;
  order: number;
};

const formatGhc = (value: number): string =>
  `GHC${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const asPercent = (part: number, total: number): string =>
  `${(total > 0 ? (part / total) * 100 : 0).toFixed(1)}%`;

export function CategoriesPage({ categories, items, sales }: Props) {
  const { formatMoney } = useMerchant();

  const categoryStats = useMemo(() => {
    const orderIndex = new Map(categories.map((entry, index) => [entry.id, index] as const));
    const itemById = new Map(items.map((item) => [item.id, item] as const));
    const itemByName = new Map(items.map((item) => [item.name, item] as const));
    const salesByCategory = new Map<string, { units: number; revenue: number }>();

    for (const sale of sales) {
      for (const line of sale.items) {
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
      .map((category) => {
        const rows = items.filter((item) => {
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
            rows.reduce((sum, row) => sum + row.quantity * row.sellingPrice, 0).toFixed(2)
          ),
          totalUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
          productsCount: rows.length,
          soldUnits: salesStat.units,
          salesRevenue: salesStat.revenue,
          lowStock: rows.filter((row) => row.status !== "in-stock").length,
          order: orderIndex.get(category.id) ?? 9999
        } satisfies CategoryStat;
      })
      .sort((a, b) => {
        if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
        const ap = a.id === "more" ? 1 : 0;
        const bp = b.id === "more" ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.order - b.order;
      });
  }, [categories, items, sales]);

  const ringValue = categoryStats.map((row) => ({ name: row.name, value: row.totalValue, color: row.color }));
  const ringProducts = categoryStats.map((row) => ({ name: row.name, value: row.productsCount, color: row.color }));
  const ringUnits = categoryStats.map((row) => ({ name: row.name, value: row.totalUnits, color: row.color }));
  const totals = useMemo(
    () => ({
      value: categoryStats.reduce((sum, row) => sum + row.totalValue, 0),
      products: categoryStats.reduce((sum, row) => sum + row.productsCount, 0),
      units: categoryStats.reduce((sum, row) => sum + row.totalUnits, 0)
    }),
    [categoryStats]
  );
  const categoryByName = useMemo(
    () => new Map(categoryStats.map((row) => [row.name, row] as const)),
    [categoryStats]
  );
  const maxPerformance = useMemo(
    () =>
      categoryStats.reduce((max, row) => {
        const score = row.salesRevenue > 0 ? row.salesRevenue : row.totalValue;
        return Math.max(max, score);
      }, 0),
    [categoryStats]
  );

  return (
    <div className="page-stack">
      <section className="panel" data-tour="categories-ring">
        <div className="panel-head">
          <div>
            <h3>Inventory by Category</h3>
            <p>Category stock value, number of products, and total units</p>
          </div>
        </div>
        <div style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const hoveredName = String(payload[0]?.payload?.name ?? "");
                  const row = categoryByName.get(hoveredName);
                  if (!row) return null;
                  return (
                    <div className="chart-tooltip">
                      <p>{row.name}</p>
                      <small>{`Inventory value: ${formatGhc(row.totalValue)} (${asPercent(row.totalValue, totals.value)})`}</small>
                      <small>{`Product count: ${row.productsCount} (${asPercent(row.productsCount, totals.products)})`}</small>
                      <small>{`Stock units: ${row.totalUnits} (${asPercent(row.totalUnits, totals.units)})`}</small>
                    </div>
                  );
                }}
              />
              <Pie data={ringValue} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={96} outerRadius={132}>
                {ringValue.map((entry) => (
                  <Cell key={`value-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Pie data={ringProducts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={92}>
                {ringProducts.map((entry) => (
                  <Cell key={`products-${entry.name}`} fill={entry.color} fillOpacity={0.75} />
                ))}
              </Pie>
              <Pie data={ringUnits} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={66}>
                {ringUnits.map((entry) => (
                  <Cell key={`units-${entry.name}`} fill={entry.color} fillOpacity={0.5} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel" data-tour="categories-performance">
        <div className="panel-head">
          <div>
            <h3>Category Performance</h3>
            <p>Horizontal lane comparison by revenue (fallback to inventory value)</p>
          </div>
        </div>
        <div className="list-stack">
          {categoryStats.map((category) => {
            const score = category.salesRevenue > 0 ? category.salesRevenue : category.totalValue;
            const width = maxPerformance > 0 ? (score / maxPerformance) * 100 : 0;
            return (
              <div key={`performance-${category.id}`} className="performance-row">
                <div className="line-item">
                  <span>{category.name}</span>
                  <strong>{formatMoney(score)}</strong>
                </div>
                <div className="performance-track">
                  <span
                    className="performance-bar"
                    style={{ width: `${width}%`, background: category.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" data-tour="categories-details">
        <div className="panel-head">
          <div>
            <h3>Category Details</h3>
            <p>Subcategories, stock, low stock, and sales by category</p>
          </div>
        </div>
        <div className="card-grid">
          {categoryStats.map((category) => (
            <article
              className="stat-card category-card"
              key={category.id}
              style={
                {
                  ["--category-color" as string]: category.color
                } as CSSProperties
              }
            >
              <div className="stat-head">
                <div className="color-dot" style={{ background: category.color }} />
                <div>
                  <h4>{category.name}</h4>
                  <small>{category.productsCount} products</small>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {category.subcategories.map((subcategory) => (
                  <span key={`${category.id}-${subcategory}`} className="pill">
                    {subcategory}
                  </span>
                ))}
                {category.subcategories.length === 0 && <span className="pill">No subcategories</span>}
              </div>

              <div className="line-item">
                <span>Inventory value</span>
                <strong>{formatMoney(category.totalValue)}</strong>
              </div>
              <div className="line-item">
                <span>Total units</span>
                <strong>{category.totalUnits}</strong>
              </div>
              <div className="line-item">
                <span>Units sold</span>
                <strong>{category.soldUnits}</strong>
              </div>
              <div className="line-item">
                <span>Sales revenue</span>
                <strong>{formatMoney(category.salesRevenue)}</strong>
              </div>
              {category.lowStock > 0 && (
                <div className="line-item danger-line">
                  <span>Low stock</span>
                  <strong>{category.lowStock} items</strong>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
