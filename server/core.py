import csv
import networkx as nx  # type: ignore
import matplotlib.pyplot as plt
from itertools import combinations
from pathlib import Path
import os
from dotenv import load_dotenv
from openai import OpenAI
from typing import Dict, List, Tuple, Set, Optional

# 1. CONFIG
CSV_PATH = Path(__file__).parent / "data" / "fridge_items.csv"
THETA    = 0.20


KNOWN_RECIPES: Set[Tuple[str, str]] = {  #known recipes
    ("Chicken","Yoghurt"),
    ("Chicken","Curd"),
    ("Cucumber","Onions"),
    ("Gotu Kola","Scraped Coconut"),
    ("Gotu Kola","Onions")
}
KNOWN_PAIRS   = { tuple(sorted(p)) for p in KNOWN_RECIPES }

# allowed category pairs
T_EDGES = {
    ("Protein","Vegetable"), ("Protein","Dairy"), ("Protein","Starch"),
    ("Vegetable","Starch"), ("Dairy","Starch"),("Vegetable","Vegetable")
}
T_EDGES |= {(b,a) for (a,b) in T_EDGES}

# 2. LOAD
def loadFridge(path):
    fridge = {}
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            name = r["item"].strip().title()
            fridge[name] = {
                "category"   : r["category"].strip().title(),
                "flavours"   : {t.strip().lower() for t in r["flavouragTags"].split(";") if t.strip()},
                "daysLeft"   : int(r["daysLeft"]),
                "expiryLimit": int(r["expiryLimit"])
            }
    return fridge

# 3. FINDING THE TOP WEIGHTED INGREDIENTS

def pairsgraph(G: nx.Graph) -> List[Dict]:
    edgeWeights = [ (tuple(sorted((u, v))), d["weight"])
                     for u, v, d in G.edges(data=True) ]
    topPairs = sorted(edgeWeights, key=lambda t: t[1], reverse=True)[:3]
    pairsList = [{"a": a, "b": b, "weight": w} for (a, b), w in topPairs]
    topItemsDict = { pair: weight for pair, weight in topPairs}
    return pairsList, topItemsDict


def computePairsRecipes(
    csv_path: Path = CSV_PATH,
    save_plot: bool = False,
    plot_path: Optional[Path] = None ):
    
    ingredients = loadFridge(CSV_PATH)

    #Build Graph
    G = nx.Graph()
    G.add_nodes_from(ingredients)

    # 3a) force in known recipes
    for u, v in KNOWN_PAIRS:
        if u in ingredients and v in ingredients:
        # compute the same weight formula if you like:
            itemU, itemV = ingredients[u]["flavours"], ingredients[v]["flavours"]
            similarity = len(itemU & itemV) / len(itemU | itemV) if (itemU | itemV) else 0
            urgencyU = ingredients[u]["expiryLimit"] - ingredients[u]["daysLeft"]
            urgencyV = ingredients[v]["expiryLimit"] - ingredients[v]["daysLeft"]
            weight = round(urgencyU + urgencyV + similarity, 2)
            G.add_edge(u, v, weight=weight, similarity=round(similarity,2), known=True)

    # 3b) now everything else by category+Jaccard
    for i, j in combinations(ingredients, 2):
        pair = tuple(sorted((i, j)))
        if pair in KNOWN_PAIRS:
            continue
        categoryI = ingredients[i]["category"]
        categoryJ = ingredients[j]["category"]
        if (categoryI, categoryJ) not in T_EDGES:
            continue
        itemI, itemJ = ingredients[i]["flavours"], ingredients[j]["flavours"]
        union = itemI | itemJ
        similarity   = len(itemI & itemJ) / len(union) if union else 0
        if similarity < THETA:
            continue
        urgencyI = ingredients[i]["expiryLimit"] - ingredients[i]["daysLeft"]
        urgencyJ = ingredients[j]["expiryLimit"] - ingredients[j]["daysLeft"]
        weight = round(urgencyI + urgencyJ + similarity, 2)
        G.add_edge(i, j, weight=weight, similarity=round(similarity,2), known=False)

        pairs, topItemsDictionary = pairsgraph(G)

    # 3c) CONNECT THE LLM

    load_dotenv() # Load the env file
    apiKey = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=apiKey)
    rawText = ""
    recipesBlocks: List[str] = []

    prompt = f"""
    Role: You are a Sri Lankan chef or a homecook.

    Instructions:
    1. Consider the given ingredients: {topItemsDictionary},
    2. Based on those suggest 1 - 3 simple Sri Lankan or Indian style meal recipe ideas.
    3. The meal can be a main dish, side dish, desserts or drink


    Steps:
    1. Identify what are the ingredients you have as pairs.
    2. You can mix those items or use them individually.
    3. Suppose you have the given ingredient pairs and usual spices and basic things required to cook the meal.
    4. Keep the recipes short and easy for home cooking.
    5. Each recipe should use following structure.
        - Name of the food.
        - 1 to 2 line small description.
        - Ingredients required including the given ingrdient pair.
        - Simple instructions.

        example:

        "Gotukola Sambola"

        Indredients : Gotukola, Onions, Scraped Coconut, Salt, Tomato, Chilli and Lime extract

        Instructions:
        1. Wash the Gotukola leaves and Dry it.
        2. Scraped the coconut.
        3. Mince the Gotukola Leaves add it to a bowl.
        4. Thinly Sliced a green chilli.
        5. Sliced an onion and a tomato.
        6. Put the sliced onion, Tomato, green chillies and scraped coconut in to a ball and mix it.
        7. Add a pinch of salt.
        8. Add some lime extract.
        ---

    End Goal:
    You should deliver simple Sri Lankan style meal recipe ideas by utilizing the ingredients given.

    Narrow:
    1. Do not provide complex instructions.
    2. Do not use * or ** in the response.

    """

    response = client.responses.create(
        model="gpt-4o",
        input=prompt,
    )

    rawText = response.output_text  
    # Provide the UI-friendly array of blocks (split by newline)
    recipesBlocks = [b.strip() for b in rawText.split("\n") if b.strip()]

    saved_plot = None
    # 3d) DRAW

    pos = nx.circular_layout(G)
    plt.figure(figsize=(6,6))
    nx.draw_networkx_nodes(G, pos, node_size=1800, node_color="#ffd58c", edgecolors="black")
    nx.draw_networkx_labels(G, pos, font_size=10)

    # split edges by type
    known_edges = [(u,v) for u,v,d in G.edges(data=True) if d.get("known")]
    other_edges = [(u,v) for u,v,d in G.edges(data=True) if not d.get("known")]

    # dashed for cut‑off edges
    nx.draw_networkx_edges(G, pos, edgelist=other_edges, style="dashed", alpha=0.6)
    # solid blue for your known recipes
    nx.draw_networkx_edges(G, pos, edgelist=known_edges, width=2, edge_color="blue")

    # show weights on every edge
    labels = { (u,v):d["weight"] for u,v,d in G.edges(data=True) }
    nx.draw_networkx_edge_labels(G, pos, edge_labels=labels, font_size=8)

    plt.title("Meal‑pair Graph: Known (blue) + Cut‑off (dashed)")
    plt.axis("off")
    plt.tight_layout()

    plot_path = plot_path or (Path(__file__).parent / "data" / "graph.png")
    plt.savefig(plot_path, dpi=160, bbox_inches="tight")
    plt.close()
    saved_plot = str(plot_path)

    return {
        "pairs": pairs,                          
        "top_dict": topItemsDictionary,          
        "recipes": recipesBlocks,               
        "raw": rawText,                         
        "graph_path": saved_plot           
    }
