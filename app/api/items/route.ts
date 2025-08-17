import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const CSV = path.join(process.cwd(), "fridge_items.csv");

// Minimal CSV parser for your simple schema (no commas inside fields)
export function parse(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: any = {};
    headers.forEach((h, i) => (row[h] = cols[i]?.trim() ?? ""));
    // numberify two columns
    row.days_left = Number(row.days_left);
    row.expiry_limit = Number(row.expiry_limit);
    return row;
  });
}

export async function GET() {
  const txt = await fs.readFile(CSV, "utf8");
  const items = parse(txt);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // build a CSV line in the same column order
    const line = [
      (body.item ?? "").toString().trim(),
      (body.category ?? "").toString().trim(),
      (body.flavour_tags ?? "").toString().trim(),   // semicolon-separated
      Number(body.days_left ?? 0),
      Number(body.expiry_limit ?? 30),
    ].join(",");

    // append with newline
    await fs.appendFile(CSV, "\n" + line, "utf8");

    // return refreshed rows
    const txt = await fs.readFile(CSV, "utf8");
    const items = parse(txt);
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Append failed" }, { status: 500 });
  }
}
