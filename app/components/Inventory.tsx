"use client";
import { Box, Card, Flex, Heading, Table, Text } from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
export type Item = {
  item: string;
  category: string;
  flavourTags: string;
  daysLeft: number;
  expiryLimit: number;
};

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Box
      pt="4"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gap: "1rem",
      }}
    >
      <Box className="col-span-12 lg:col-span-7">
        <Card variant="classic" className="rounded-2xl shadow">
          <Flex align="center" justify="between" mb="3">
            <Heading size="4">Inventory</Heading>
          </Flex>

          <Box className="overflow-x-auto">
            <Table.Root variant="surface" size="2">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Item</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Flavour Tags</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Days Left</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Expiry Limit</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {items.map((r, i) => (
                  <Table.Row key={i}>
                    <Table.Cell>{r.item}</Table.Cell>
                    <Table.Cell>{r.category}</Table.Cell>
                    <Table.Cell className="text-slate-600">
                      {r.flavourTags}
                    </Table.Cell>
                    <Table.Cell>{r.daysLeft}</Table.Cell>
                    <Table.Cell>{r.expiryLimit}</Table.Cell>
                  </Table.Row>
                ))}

                {items.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <Text color="gray">
                        No items found. Add something and click <i>Reload</i>.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Inventory;
