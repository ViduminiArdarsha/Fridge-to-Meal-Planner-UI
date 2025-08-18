"use client";
import { useEffect, useState } from "react";
import AddItemForm from "./components/AddItemForm";

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
      const res = await fetch("/api/items", { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
    })();
  }, []);

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
        <h1 className="text-xl font-semibold">Fridge-to-Meal Planner</h1>
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
            <h2 className="text-lg font-semibold mb-3">Inventory</h2>
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

          <div className="col-span-12 flex items-center gap-2">
            <AddItemForm />
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
        </section>

        {/* Right: Pairs + Recipe Cards */}
        <section className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">About to Expire...</h2>
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
                {(() => {
                  // 1) filter out unwanted cards
                  const filtered = recipes.filter((block) => {
                    const first = block.trim().split("\n")[0];
                    if (/^Top-3 candidate pairs/i.test(first)) return false;
                    if (first === "---") return false;
                    return true;
                  });

                  // 2) group blocks by '---' delimiter from the ORIGINAL array
                  const groups: string[][] = [];
                  let cur: string[] = [];
                  for (const block of recipes) {
                    const head = block.trim().split("\n")[0];
                    if (/^Top-3 candidate pairs/i.test(head)) continue; // skip
                    if (head === "---") {
                      if (cur.length) groups.push(cur), (cur = []);
                      continue;
                    }
                    cur.push(block.trim());
                  }
                  if (cur.length) groups.push(cur);

                  // 3) render one card per group, joining blocks
                  return groups.map((group, idx) => {
                    const title =
                      group[0]
                        ?.split("\n")[0]
                        .replace(/^[*"\s]+|[*"\s]+$/g, "") ||
                      `Recipe ${idx + 1}`;

                    // join blocks with a blank line; optionally remove duplicated headings
                    const body = group
                      .join("\n\n")
                      .replace(/^(Ingredients: .+)\n\1/m, "$1") // collapse duplicate Ingredients line
                      .replace(/^(Instructions:)\n\1/m, "$1"); // collapse duplicate Instructions line

                    return (
                      <article key={idx} className="rounded-2xl border p-4">
                        <h3 className="font-semibold mb-1">{title}</h3>
                        <p className="text-sm whitespace-pre-wrap text-slate-700">
                          {body}
                        </p>
                      </article>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
