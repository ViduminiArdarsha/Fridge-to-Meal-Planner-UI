"use client";
import { useEffect, useState } from "react";
import AddItemForm from "./components/AddItemForm";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";
import Inventory from "./components/Inventory";
import Header from "./components/Header";
import ComputePairsandRecipes from "./components/ComputePairsandRecipes";

type Pair = { a: string; b: string; weight: number };

export default function Home() {
  // UI state
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      <Header computeRecipes={computeRecipes} loading={loading} />

      <AddItemForm />
      <Grid columns={{ initial: "1", lg: "2" }} gap="4" mt="4">
        <Box>
          <Inventory />
        </Box>
        <Box>
          <ComputePairsandRecipes pairs={pairs} recipes={recipes} />
        </Box>
      </Grid>
    </main>
  );
}
