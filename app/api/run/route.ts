// app/api/run/route.ts
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Your existing script at the project root (do not move/change it)
const PY = path.join(process.cwd(), "FridgeToMealPlanner.py");

// Regex to extract dict entries like:  ('Chicken','Broccoli'): 54.0
const PAIR_RE = /\('([^']+)'\s*,\s*'([^']+)'\)\s*:\s*([0-9.]+)/g;

// Split printed recipe text into card-sized chunks
function splitRecipes(text: string): string[] {
  const blocks = text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;

  const lines = text.split(/\n/);
  const cards: string[] = [];
  let buf: string[] = [];
  for (const ln of lines) {
    if (/^\s*([*"\u201C])/.test(ln) && buf.length) {
      cards.push(buf.join("\n").trim());
      buf = [];
    }
    buf.push(ln);
  }
  if (buf.length) cards.push(buf.join("\n").trim());
  return cards.filter(Boolean);
}

// Run a command and capture output with timeout
function runOnce(cmd: string, args: string[], timeoutMs = 90_000): Promise<{ code: number | null; out: string; err: string; startErr?: Error }> {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    let startErr: Error | undefined;

    const proc = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      try { proc.kill(); } catch {}
    }, timeoutMs);

    proc.on("error", (e) => {
      startErr = e as Error; // e.g., ENOENT (command not found)
    });
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err, startErr });
    });
  });
}

// Try Windows-friendly launchers in order:
// 1) py -3 (Python launcher)  2) python  3) PYTHON_PATH env (absolute path)
async function runWithWindowsFallback(scriptPath: string) {
  // 1) py -3 script.py
  let res = await runOnce("py", ["-3", scriptPath]);
  if (res.startErr && (res as any).startErr?.name === "Error" && (res as any).startErr['code'] === "ENOENT") {
    // 'py' not found → try python
    res = await runOnce("python", [scriptPath]);
    if (res.startErr && (res as any).startErr['code'] === "ENOENT") {
      // 'python' not found → try absolute path from env
      const pyPath = process.env.PYTHON_PATH; // e.g. C:\Users\YOU\AppData\Local\Programs\Python\Python311\python.exe
      if (!pyPath) {
        throw new Error(
          "Python was not found. Fix one of these: \n" +
          "• Install Python from python.org and ensure the Windows launcher 'py' is available (recommended), OR\n" +
          "• Add 'python' to PATH, OR\n" +
          "• Set an absolute path via env var PYTHON_PATH to python.exe."
        );
      }
      res = await runOnce(pyPath, [scriptPath]);
    }
  }
  return res;
}

export async function POST() {
  try {
    // Force Windows path (your request said Windows 11 x64)
    if (process.platform !== "win32") {
      return NextResponse.json(
        { error: "This endpoint is configured for Windows. Detected: " + process.platform },
        { status: 400 }
      );
    }

    const { code, out, err } = await runWithWindowsFallback(PY);

    if (code !== 0) {
      // If Python printed errors to stderr or exited non-zero
      const msg = (err && err.trim()) || `Python exited with code ${code}`;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Parse top pairs printed as a Python dict
    const pairs: { a: string; b: string; weight: number }[] = [];
    for (const m of out.matchAll(PAIR_RE)) {
      pairs.push({ a: m[1], b: m[2], weight: Number(m[3]) });
    }

    // Heuristic split of recipe text into cards
    const recipes = splitRecipes(out);

    return NextResponse.json({ ok: true, pairs, recipes, raw: out });
  } catch (e: any) {
    // Helpful hints for the common Windows 11 issue (Store shim / aliases)
    const extra =
      "\nIf Windows opens the Store or says 'Python was not found':\n" +
      "• Install Python from python.org (not the Store).\n" +
      "• Ensure the 'py' launcher works: run 'py -3 --version' in CMD/PowerShell.\n" +
      "• Or set env var PYTHON_PATH to your python.exe full path.\n" +
      "• Settings → Apps → Advanced app settings → App execution aliases → turn OFF Python aliases if they interfere.";
    return NextResponse.json({ error: (e?.message || String(e)) + extra }, { status: 500 });
  }
}
