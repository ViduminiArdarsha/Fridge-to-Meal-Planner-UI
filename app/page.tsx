"use client";
import { useEffect, useState } from "react";
import AddItemForm from "./components/AddItemForm";
import {
  Badge,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";

// ---------- Types ----------
type Item = {
  item: string;
  category: string;
  flavourTags: string; // semicolon-separated
  daysLeft: number;
  expiryLimit: number;
};

type Pair = { a: string; b: string; weight: number };

export default function Home() {
  // UI state
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: reusable loader with proper error handling ---
  async function loadItems() {
    try {
      setError(null);
      const res = await fetch("/api/items", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Failed to load items");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load items");
      setItems([]);
    }
  }

  // Load CSV rows on mount
  useEffect(() => {
    loadItems();
  }, []);

  // Run Python (FastAPI), parse pairs + recipes
  async function computeRecipes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Python run failed.");
      }
      setPairs(Array.isArray(data.pairs) ? data.pairs : []);
      // Backend returns: { recipes: string[], raw: string }
      const got =
        Array.isArray(data.recipes) && data.recipes.length > 0
          ? data.recipes
          : data.raw
          ? [data.raw]
          : [];
      setRecipes(got);
    } catch (e: any) {
      setError(e?.message || "Python run failed.");
      setPairs([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="">
      <header className="sticky top-0 z-10 bg-white px-6 py-4 flex justify-between border-b">
        <h1 className="font-eduCursive text-2xl font-semibold text-gray-800">
          Fridge-to-Meal Planner
        </h1>
        <div className="flex gap-2">
          <Button
            radius="full"
            size="3"
            color="green"
            onClick={computeRecipes}
            aria-busy={loading}
          >
            {loading ? "Running..." : "Compute Pairs & Recipes"}
          </Button>
        </div>
      </header>

      <div className="col-span-12 flex items-center gap-2 mt-3 p-5">
        <AddItemForm />
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <div className="grid grid-cols-12 gap-4 p-4">
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Inventory</h2>
              <button
                onClick={loadItems}
                className="text-sm text-slate-600 underline underline-offset-2"
                title="Reload items from CSV"
              >
                Reload
              </button>
            </div>

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
                        {r.flavourTags}
                      </td>
                      <td className="py-2 pr-4">{r.daysLeft}</td>
                      <td className="py-2 pr-4">{r.expiryLimit}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-500">
                        No items found. Add something and click <i>Reload</i>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Item */}
          {/* (AddItemForm lives above the grid; keep or move as you like) */}
        </section>

        {/* Right: Pairs + Recipe Cards */}
        <section className="col-span-12 lg:col-span-5 space-y-4">
          <Card variant="classic">
            <Flex align="center" justify="between" mb="2">
              <Heading size="3">About to Expire...</Heading>
            </Flex>

            {pairs.length === 0 ? (
              <Text color="gray">
                Click <b>Compute Pairs & Recipes</b> to find pairs about to
                expire.
              </Text>
            ) : (
              <Grid columns={{ initial: "1" }} gap="3">
                {pairs.map((p, i) => {
                  const color =
                    i === 0
                      ? "red"
                      : i === 1
                      ? "yellow"
                      : i === 2
                      ? "blue"
                      : "gray";

                  return (
                    <Callout.Root
                      color= {`${color}`}
                      key={`${p.a}-${p.b}-${i}`}
                      variant="surface"
                    >
                      
                        <Flex align="center" justify="between" gapX="5">
                          <Text weight="medium">
                            {p.a} — {p.b}
                          </Text>
                          <Text size="1" className="font-mono" >
                            w={p.weight}
                          </Text>
                        </Flex>
                      
                    </Callout.Root>
                  );
                })}
              </Grid>
            )}
          </Card>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Recipes</h2>
            {recipes.length === 0 ? (
              <p className="text-sm text-slate-600">
                Click <b>Compute Pairs & Recipes</b> to generate recipe ideas.
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

                    const body = group
                      .join("\n\n")
                      .replace(/^(Ingredients: .+)\n\1/m, "$1")
                      .replace(/^(Instructions:)\n\1/m, "$1");

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
