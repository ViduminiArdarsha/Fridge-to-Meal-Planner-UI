import { Box, Flex, Grid, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";
import AddItemBtn from "./AddItemBtn";
import { Item } from "./Inventory";


const AddItemForm = () => {
  const [form, setForm] = useState<Item>({
    item: "",
    category: "Protein",
    flavourTags: "",
    daysLeft: 0,
    expiryLimit: 1,
  });
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <Box className="bg-white rounded-2xl shadow p-6 mt-4">
      <Heading size="5">
        Add Item
      </Heading>

      <form>
        <Grid columns={{ initial: "1", md: "5" }} gap="3" mt="3" gapY="5">
          <Flex direction="column">
            <Text>Item Name</Text>
            <TextField.Root
              radius="large"
              placeholder="e.g. Chicken"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
            />
          </Flex>

          <Flex direction="column">
            <Text>Item Category</Text>
            <Select.Root
              defaultValue={form.category}
              onValueChange={(val) =>
                setForm({
                  ...form,
                  category: val,
                })
              }
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="Protein">Protein</Select.Item>
                <Select.Item value="Vegetable">Vegetable</Select.Item>
                <Select.Item value="Dairy">Dairy</Select.Item>
                <Select.Item value="Starch">Starch</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column">
            <Text>Item Flavours</Text>
            <TextField.Root
              placeholder="flavour Tags"
              value={form.flavourTags}
              onChange={(e) =>
                setForm({ ...form, flavourTags: e.target.value })
              }
            />
          </Flex>

          <Flex direction="column">
            <Text>Days Left for Expiry</Text>
            <TextField.Root
              value={form.daysLeft}
              min={0}
              onChange={(e) =>
                setForm({ ...form, daysLeft: Number(e.target.value) })
              }
              title="days_left"
            />
          </Flex>

          <Flex direction="column">
            <Text>Expiry Limit</Text>
            <TextField.Root
              value={form.expiryLimit}
              min={1}
              onChange={(e) =>
                setForm({ ...form, expiryLimit: Number(e.target.value) })
              }
              title="expiry_limit"
            />
          </Flex>
        </Grid>

        <Box className="mt-3">
          <AddItemBtn
            form={form}
            setForm={setForm}
            setItems={setItems}
            setError={setError}
          />
        </Box>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>
    </Box>
  );
};

export default AddItemForm;
