"use client";
import { Box, Callout, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import React from "react";

export type Pair = { a: string; b: string; weight: number };

interface RecipesAndPairsProps {
  pairs: Pair[];
  recipes: string[];
}

const ComputePairsandRecipes: React.FC<RecipesAndPairsProps> = ({
  pairs,
  recipes,
}) => {
  return (
    <>
      <Box className="bg-white rounded-2xl shadow p-6">
        <Flex align="center" justify="between" mb="2">
          <Heading size="5">About to Expire...</Heading>
        </Flex>

        {pairs.length === 0 ? (
          <Text color="gray">
            Click <b>Compute Pairs & Recipes</b> to find pairs about to expire.
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
                  color={`${color}`}
                  key={`${p.a}-${p.b}-${i}`}
                  variant="surface"
                >
                  <Flex align="center" justify="between" gapX="5">
                    <Text weight="medium">
                      {p.a} — {p.b}
                    </Text>
                    <Text size="1" className="font-mono">
                      w={p.weight}
                    </Text>
                  </Flex>
                </Callout.Root>
              );
            })}
          </Grid>
        )}
      </Box>

      <Box className="bg-white rounded-2xl shadow p-6 mt-4">
        <Heading size="5" mb="2">
          Recipes
        </Heading>
        {recipes.length === 0 ? (
          <Text color="gray">
            Click <b>Compute Pairs & Recipes</b> to generate recipe ideas.
          </Text>
        ) : (
          <Box className="grid gap-3">
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
                  group[0]?.split("\n")[0].replace(/^[*"\s]+|[*"\s]+$/g, "") ||
                  `Recipe ${idx + 1}`;

                const body = group
                  .join("\n\n")
                  .replace(/^(Ingredients: .+)\n\1/m, "$1")
                  .replace(/^(Instructions:)\n\1/m, "$1");

                return (
                  <article key={idx} className="rounded-2xl border p-4 my-3">
                    <Heading size="4">{title}</Heading>
                    <p className="text-sm whitespace-pre-wrap text-slate-700">
                      {body}
                    </p>
                  </article>
                );
              });
            })()}
          </Box>
        )}
      </Box>
    </>
  );
};

export default ComputePairsandRecipes;
