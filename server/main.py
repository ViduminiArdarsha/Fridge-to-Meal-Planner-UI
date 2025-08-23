from typing import List, Dict
from pathlib import Path
import csv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

from core import computePairsRecipes, CSV_PATH

app = FastAPI(title="Fridge-to-Meal API", version="1.0")

# Allow Next.js dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ItemIn(BaseModel):
    item: str
    category: str
    flavourTags: str
    daysLeft: int
    expiryLimit: int

    @field_validator("item", "category")
    @classmethod
    def titlecase(cls, v: str) -> str:
        return v.strip().title()

class PairOut(BaseModel):
    a: str
    b: str
    weight: float

class ItemsResponse(BaseModel):
    items: List[ItemIn]

class RunResponse(BaseModel):
    pairs: List[PairOut]
    recipes: List[str]
    raw: str

# CSV I/O just for API
def readItemsList(csv_path: Path) -> List[Dict]:
    rows: List[Dict] = []
    with csv_path.open(newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            rows.append({
                "item": r["item"].strip().title(),
                "category": r["category"].strip().title(),
                "flavourTags": r["flavourTags"].strip(),
                "daysLeft": int(r["daysLeft"]),
                "expiryLimit": int(r["expiryLimit"]),
            })
    return rows

def appendItem(row: Dict, csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    norm = {
        "item": row["item"].strip().title(),
        "category": row["category"].strip().title(),
        "flavourTags": row["flavourTags"].strip(),
        "daysLeft": int(row["daysLeft"]),
        "expiryLimit": int(row["expiryLimit"]),
    }
    fileExists = csv_path.exists()
    with csv_path.open("a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["item","category","flavourTags","daysLeft","expiryLimit"])
        if not fileExists:
            writer.writeheader()
        writer.writerow(norm)

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({
        "status": "ok",
        "service": "Fridge-to-Meal API",
        "endpoints": ["/items", "/run", "/docs", "/healthz"]
    })

@app.get("/items", response_model=ItemsResponse)
def listItems():
    return {"items": readItemsList(CSV_PATH)}

@app.post("/items", response_model=ItemsResponse)
def add_item(item: ItemIn):
    appendItem(item.model_dump(), CSV_PATH)
    return {"items": readItemsList(CSV_PATH)}

@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}

@app.post("/run", response_model=RunResponse)
def run():
    try:
        result = computePairsRecipes(csv_path=CSV_PATH, save_plot=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compute error: {e}")


    return {
        "pairs": result["pairs"],
        "recipes": result["recipes"],
        "raw": result["raw"],
    }
