import React from "react";

import { useState } from "react";
import AddItemBtn from "./AddItemBtn";

const AddItemForm = () => {
  const [form, setForm] = useState({
    item: "",
    category: "Protein",
    flavour_tags: "",
    days_left: 0,
    expiry_limit: 1,
  });

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-semibold mb-3">Add Item </h3>
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
          onChange={(e) => setForm({ ...form, flavour_tags: e.target.value })}
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
      </div>
      <div className="mt-3">
        <AddItemBtn />
      </div>
    </div>
  );
};

export default AddItemForm;
