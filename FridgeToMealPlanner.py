import csv
import networkx as nx # type: ignore
import matplotlib.pyplot as plt
from itertools import combinations
from pathlib import Path
import os
from dotenv import load_dotenv
from openai import OpenAI

# 1. CONFIG
CSV_PATH = "fridge_items.csv"
THETA    = 0.20

# EXACT item names as your loader will title‑case them
KNOWN_RECIPES = { ("Chicken","Yoghurt"),("Chicken","Curd"),("Cucumber","Onions"),("Gotu Kola","Scraped Coconut"),("Gotu Kola","Onions") } #Known Recipes
KNOWN_PAIRS   = { tuple(sorted(p)) for p in KNOWN_RECIPES }

# allowed category pairs
T_EDGES = {
    ("Protein","Vegetable"), ("Protein","Dairy"), ("Protein","Starch"),
    ("Vegetable","Starch"), ("Dairy","Starch"),("Vegetable","Vegetable")
}
T_EDGES |= {(b,a) for (a,b) in T_EDGES}

# 2. LOAD
def load_fridge(path):
    fridge = {}
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            name = r["item"].strip().title()
            fridge[name] = {
                "category"    : r["category"].strip().title(),
                "attrs"       : {t.strip().lower() for t in r["flavour_tags"].split(";") if t.strip()},
                "days_left"   : int(r["days_left"]),
                "expiry_limit": int(r["expiry_limit"])
            }
    return fridge

ingredients = load_fridge(CSV_PATH)

# 3. BUILD GRAPH
G = nx.Graph()
G.add_nodes_from(ingredients)

# 3a) force in known recipes
for u, v in KNOWN_PAIRS:
    if u in ingredients and v in ingredients:
        # compute the same weight formula if you like:
        attrs_u, attrs_v = ingredients[u]["attrs"], ingredients[v]["attrs"]
        sim = len(attrs_u & attrs_v) / len(attrs_u | attrs_v) if (attrs_u|attrs_v) else 0
        urg_u = ingredients[u]["expiry_limit"] - ingredients[u]["days_left"]
        urg_v = ingredients[v]["expiry_limit"] - ingredients[v]["days_left"]
        weight = round(urg_u + urg_v + sim, 2)
        G.add_edge(u, v, weight=weight, sim=round(sim,2), known=True)

# 3b) now everything else by category+Jaccard
for i, j in combinations(ingredients, 2):
    pair = tuple(sorted((i, j)))
    if pair in KNOWN_PAIRS:
        continue
    cat_i = ingredients[i]["category"]
    cat_j = ingredients[j]["category"]
    if (cat_i, cat_j) not in T_EDGES:
        continue
    attrs_i, attrs_j = ingredients[i]["attrs"], ingredients[j]["attrs"]
    union = attrs_i | attrs_j
    sim   = len(attrs_i & attrs_j) / len(union) if union else 0
    if sim < THETA:
        continue
    urg_i = ingredients[i]["expiry_limit"] - ingredients[i]["days_left"]
    urg_j = ingredients[j]["expiry_limit"] - ingredients[j]["days_left"]
    weight = round(urg_i + urg_j + sim, 2)
    G.add_edge(i, j, weight=weight, sim=round(sim,2), known=False)

# Add the top wieghted ingredients to a dictionary

edge_weights = [ (tuple(sorted((u, v))), d["weight"])
                 for u, v, d in G.edges(data=True) ]

# grab the three largest by weight
top3_pairs = sorted(edge_weights, key=lambda t: t[1], reverse=True)[:3]

topItemsDictionary = { pair: weight for pair, weight in top3_pairs }

print("Top-3 candidate pairs as a dictionary:")
print(topItemsDictionary)

# 4. CONNECT THE LLM

load_dotenv() # Load the env file
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

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

print(response.output_text)

# 5. DRAW
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
plt.show()
