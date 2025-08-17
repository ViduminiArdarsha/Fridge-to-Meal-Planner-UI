import { Button } from '@radix-ui/themes';
import React, { useState } from 'react'

type Item = {
  item: string;
  category: string;
  flavour_tags: string; // semicolon-separated
  days_left: number;
  expiry_limit: number;
};

const AddItemBtn = () => {

   const [items, setItems] = useState<Item[]>([]);
   const [error, setError] = useState<string | null>(null);
   const [form, setForm] = useState<Item>({
       item: "",
       category: "Protein",
       flavour_tags: "",
       days_left: 0,
       expiry_limit: 0,
     });

  async function addItem() {
    setError(null);
    if (!form.item.trim()) 
      return setError("Item name is required.");

    const response = await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (!response.ok) 
      return setError(data.error || "Failed to add item");
    setItems(data.items); // refreshed rows from CSV
    setForm({ ...form, item: "", flavour_tags: "" }); // reset name/tags
  }

  return (
    <Button onClick={addItem} color='cyan'>
      Add Item
    </Button>
  )
}

export default AddItemBtn
