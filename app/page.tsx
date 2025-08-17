"use client";
import { useEffect, useState } from "react";

// ---------- Types ----------
type Item = {
  item: string;
  category: string;
  flavour_tags: string; // semicolon-separated
  days_left: number;
  expiry_limit: number;
};

type Pair = { a: string; b: string; weight: number };

export default function Home() {
  // UI state
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add-item form state
  const [form, setForm] = useState<Item>({
    item: "",
    category: "Protein",
    flavour_tags: "",
    days_left: 3,
    expiry_limit: 30,
  });

  // Load CSV rows on mount
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data.items || []);
    })();
  }, []);

  // Append a row to CSV
  async function addItem() {
    setError(null);
    if (!form.item.trim()) return setError("Item name is required.");
    const res = await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Failed to add item");
    setItems(data.items); // refreshed rows from CSV
    setForm({ ...form, item: "", flavour_tags: "" }); // reset name/tags
  }

  // Run Python, capture stdout, parse pairs + recipes
  async function computeRecipes() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/run", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Python run failed.");
    setPairs(data.pairs || []);
    setRecipes(data.recipes || [data.raw || ""]);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Fridge-to-Meal Planner · Demo UI
        </h1>
        <div className="flex gap-2">
          <button
            onClick={computeRecipes}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm"
          >
            {loading ? "Running..." : "Compute Pairs & Recipes"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        {/* Left: Inventory + Add Item */}
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Inventory (from CSV)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Flavour Tags</th>
                    <th className="py-2 pr-4">Days Left</th>
                    <th className="py-2 pr-4">Expiry Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i} className="border-b last:border-none">
                      <td className="py-2 pr-4">{r.item}</td>
                      <td className="py-2 pr-4">{r.category}</td>
                      <td className="py-2 pr-4 text-slate-600">
                        {r.flavour_tags}
                      </td>
                      <td className="py-2 pr-4">{r.days_left}</td>
                      <td className="py-2 pr-4">{r.expiry_limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Item */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold mb-3">Add Item (append to CSV)</h3>
            <div className="grid grid-cols-12 gap-2">
              <input
                className="col-span-3 px-2 py-1 rounded-lg border"
                placeholder="Item (e.g., Chicken)"
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
              <select
                className="col-span-2 px-2 py-1 rounded-lg border"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>Protein</option>
                <option>Vegetable</option>
                <option>Dairy</option>
                <option>Starch</option>
              </select>
              <input
                className="col-span-4 px-2 py-1 rounded-lg border"
                placeholder="flavour tags; semicolon; separated"
                value={form.flavour_tags}
                onChange={(e) =>
                  setForm({ ...form, flavour_tags: e.target.value })
                }
              />
              <input
                type="number"
                className="col-span-1 px-2 py-1 rounded-lg border"
                value={form.days_left}
                min={0}
                onChange={(e) =>
                  setForm({ ...form, days_left: Number(e.target.value) })
                }
                title="days_left"
              />
              <input
                type="number"
                className="col-span-1 px-2 py-1 rounded-lg border"
                value={form.expiry_limit}
                min={1}
                onChange={(e) =>
                  setForm({ ...form, expiry_limit: Number(e.target.value) })
                }
                title="expiry_limit"
              />
              <div className="col-span-12 flex items-center gap-2">
                <button
                  onClick={addItem}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm"
                >
                  Add
                </button>
                {error && <span className="text-red-600 text-sm">{error}</span>}
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Note: This app **appends** a CSV line; the Python script will read
              it next run.
            </p>
          </div>
        </section>

        {/* Right: Pairs + Recipe Cards */}
        <section className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">
              Top Pairs (from Python)
            </h2>
            {pairs.length === 0 ? (
              <p className="text-sm text-slate-600">
                Click <b>Compute Pairs & Recipes</b> to run your Python file.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {pairs.map((p, i) => (
                  <div
                    key={i}
                    className="border rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="font-medium">
                      {p.a} — {p.b}
                    </div>
                    <div className="text-sm font-mono">w={p.weight}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Recipes</h2>
            {recipes.length === 0 ? (
              <p className="text-sm text-slate-600">
                After running, recipe ideas from the Python LLM call appear
                here.
              </p>
            ) : (
              <div className="grid gap-3">
                {recipes.map((card, idx) => (
                  <article key={idx} className="rounded-2xl border p-4">
                    {/* naive split: first line as title if surrounded by quotes or has asterisks */}
                    <h3 className="font-semibold mb-1">
                      {card.split("\n")[0].replace(/^[*\" ]+|[*\" ]+$/g, "") ||
                        `Recipe ${idx + 1}`}
                    </h3>
                    <p className="text-sm whitespace-pre-wrap text-slate-700">
                      {card}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
