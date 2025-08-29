import { Button } from "@radix-ui/themes";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Item } from "./Inventory";

type Props = {
  form: Item;
  setForm: React.Dispatch<React.SetStateAction<Item>>;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const AddItemBtn = ({ form, setForm, setItems, setError }: Props) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // ⬅️ add this
  const addItem = async () => {
    setError(null);

    // simple validation
    if (!form.item.trim()) {
      return setError("Item name is required.");
    }

    try {
      setLoading(true);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        return setError(data.error || "Failed to add item");
      }

      // refresh parent list
      setItems(data.items ?? []);
      // reset only the fields user usually retypes
      setForm((f) => ({ ...f, item: "", flavour_tags: "" }));
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={addItem} color="green" size="2" disabled={loading}>
      {loading ? "Adding…" : "Add Item"}
    </Button>
  );
};

export default AddItemBtn;
