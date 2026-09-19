#!/usr/bin/env python3
"""
Eneba ML Diamonds Scraper - Checkout Multi-Moneda (BRL, USD, EUR) vía ScrapingAnt
- Catálogo (Cat): Precio de lista íntegro (sin restar cashback).
- Checkout (Chk): Total real cobrado en carrito (sin restar cashback).
- Cashback (%): Dato informativo de recompensa en cuenta.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from curl_cffi import requests as curl_requests


# El proyecto: raíz del repo (la carpeta que contiene este /scrapers).
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    """Carga KEY=VALUE del .env en la raíz del proyecto sin pisar variables ya definidas."""
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Falta la variable {name} en el archivo .env")
    return value


# ===========================================================================
#  CONFIGURACIÓN PRINCIPAL (DESDE .env)
# ===========================================================================

# 1. ScrapingAnt (Solo se usa en FASE 3 para checkout en Brasil)
SCRAPINGANT_API_KEY = _require_env("SCRAPINGANT_API_KEY")
# NOTA CRÉDITOS (docs ScrapingAnt): datacenter = 1 crédito/request,
# residential = 25 créditos/request. Usa residential solo si datacenter
# es bloqueado por Eneba.
SCRAPINGANT_PROXY_TYPE = "datacenter"
SCRAPINGANT_PROXY_URL = ""

# 2. Credenciales de juego para la FASE 3 (Buy Now)
ENEBA_USER_ID = _require_env("ENEBA_USER_ID")   # Tu User ID de ML (ej: "12345678")
ENEBA_ZONE_ID = _require_env("ENEBA_ZONE_ID")   # Tu Zone ID de ML (ej: "1234")
SIMULATE_CHECKOUT = True

# 3. Monedas a procesar
CURRENCIES = ["BRL", "USD", "EUR"]

# 4. Ajustes de ejecución
CHECKOUT_LIMIT = 0                       # 0 = todos los paquetes
CHECKOUT_MAX_ATTEMPTS = 3                 # Máx. reintentos por paquete vía proxy (cada intento gastan créditos)
CHECKOUT_WORKERS = 1                      # Free tier de ScrapingAnt = 1 petición simultánea (2 provoca HTTP 409)
CHECKOUT_DELAY = 1.0                      # Pausa (seg) entre peticiones para no saturar la cola del free tier
IMPERSONATE = "chrome120"
HTTP_TIMEOUT = 30
MAX_RETRIES = 3
OUTPUT_FILE = str(PROJECT_ROOT / "scrapers" / "output" / "ml_diamonds_results.json")

# ===========================================================================
#  PARÁMETROS DE ENEBA
# ===========================================================================
TARGET_URL = "https://www.eneba.com/top-up-ml-diamonds-global"
SLUG = "top-up-ml-diamonds-global"
GRAPHQL_ENDPOINT = "https://graphql.eneba.com/graphql/"

DEFAULT_MAIN_BUNDLE_URL = "https://static.eneba.games/main.9527c5c61134c4545b01.bundle.js"
DEFAULT_PEP_BUNDLE_URL = "https://static.eneba.games/containers-ProductEntryPage.94bde71d48f6f7ccc191.part.js"

CART_OPS = ("ProductNoCache", "AddToCart", "GetCart")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("eneba_scraper")


def get_scrapingant_proxy() -> str:
    if SCRAPINGANT_PROXY_URL:
        return SCRAPINGANT_PROXY_URL

    username = (
        f"scrapingant"
        f"&browser=false"
        f"&proxy_country=BR"
        f"&proxy_type={SCRAPINGANT_PROXY_TYPE}"
        f"&forward_headers=true"
    )
    return f"http://{username}:{SCRAPINGANT_API_KEY}@proxy.scrapingant.com:8080"


def _get_direct(url: str) -> str:
    s = curl_requests.Session(impersonate=IMPERSONATE)
    r = s.get(url, timeout=HTTP_TIMEOUT, headers={"Accept-Language": "en-US,en;q=0.9"})
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code} al descargar {url}")
    return r.text


def get_operation_assets() -> Dict[str, Any]:
    log.info("[BOOT] Extrayendo bundles dinámicos de Eneba en directo...")
    main_src = None
    pep_src = None

    try:
        html = _get_direct(TARGET_URL)
        candidates = re.findall(r'(https://static\.eneba\.games/[^\s"\'<>]+\.bundle\.js)', html)
        for url in candidates:
            filename = url.split("/")[-1]
            if filename.startswith("main.") and not filename.startswith("runtime~"):
                src = _get_direct(url)
                if '"ProductNoCache"' in src:
                    main_src = src
                    log.info(f"  OK Bundle principal activo: {filename}")
                    break

        part_candidates = re.findall(r'(https://static\.eneba\.games/[^\s"\'<>]+\.part\.js)', html)
        for url in part_candidates:
            if "ProductEntryPage" in url:
                pep_src = _get_direct(url)
                break
    except Exception as e:
        log.warning(f"  Aviso buscando bundles dinámicos ({e}). Usando respaldo...")

    if not main_src:
        main_src = _get_direct(DEFAULT_MAIN_BUNDLE_URL)
    if not pep_src:
        pep_src = _get_direct(DEFAULT_PEP_BUNDLE_URL)

    mv = re.search(r"eneba:www@([\d\-]+)", main_src)
    version = mv.group(1) if mv else "unknown"

    hashes: Dict[str, str] = {}
    for op in CART_OPS:
        mh = re.search(rf'"{op}"\s*:\s*"([^"]+)"', main_src)
        if not mh and pep_src:
            mh = re.search(rf'"{op}"\s*:\s*"([^"]+)"', pep_src)
        if not mh:
            raise RuntimeError(f"Hash APQ no encontrado para: {op}")
        hashes[op] = mh.group(1)

    return {
        "version": version,
        "hashes": hashes,
        "hash": hashes["ProductNoCache"],
    }


def _money(node_money):
    if not node_money or node_money.get("amount") is None:
        return None
    return round(float(node_money["amount"]) / 100.0, 2)


def fetch_offers_direct(assets: Dict[str, Any], currency: str) -> List[Dict[str, Any]]:
    payload = {
        "operationName": "ProductNoCache",
        "variables": {
            "slug": SLUG,
            "preferredMerchantSlug": None,
            "context": {"country": "BR", "language": "en", "region": "brazil"},
            "packContext": {"country": "BR", "language": "en", "region": "brazil"},
            "language": "en",
            "currency": currency,
            "abTests": [],
            "isProductVariantSearch": True,
            "source": None,
            "isCheapestAuctionIncluded": False,
            "loadCoinsValue": True,
        },
        "extensions": {"persistedQuery": {"sha256Hash": assets["hash"], "version": 1}},
    }
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-version": assets["version"],
        "Origin": "https://www.eneba.com",
        "Referer": TARGET_URL,
    }

    s = curl_requests.Session(impersonate=IMPERSONATE)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = s.post(GRAPHQL_ENDPOINT, json=payload, headers=headers, timeout=HTTP_TIMEOUT)
            data = r.json()
            auctions = (data.get("data") or {}).get("productNoCache", {}).get("auctions", {}).get("edges", [])
            if auctions:
                return [e["node"] for e in auctions]
        except Exception as e:
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Fallo catálogo en {currency}: {e}")
            time.sleep(1)
    return []


def parse_offers(nodes: List[Dict[str, Any]]) -> Dict[str, Dict[str, str]]:
    out = {}
    for n in nodes:
        name = (n.get("name") or "").strip()
        price = _money(n.get("price"))
        if not name or price is None:
            continue
        cb_obj = n.get("cashback") or {}
        cb_pct = cb_obj.get("percent")
        # PRECIO DE CATÁLOGO PURO (sin descontar cashback)
        out[name] = {
            "Precio_Catalogo": f"{price:.2f}",
            "Cashback_%": f"{cb_pct:g}" if isinstance(cb_pct, (int, float)) else "",
        }
    return out


def simulate_checkout_scrapingant(
    assets: Dict[str, Any],
    auction: Dict[str, Any],
    currency: str,
) -> Dict[str, str]:
    proxy_url = get_scrapingant_proxy()

    s = curl_requests.Session(impersonate=IMPERSONATE, verify=False)
    s.proxies = {"http": proxy_url, "https": proxy_url}
    s.cookies.set("eneba_country", "BR", domain=".eneba.com")

    s.headers.update({
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-version": assets["version"],
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
        "Origin": "https://www.eneba.com",
        "Referer": TARGET_URL,
    })

    ctx = {"country": "BR", "language": "en", "region": "brazil"}
    extra = []
    if ENEBA_USER_ID:
        extra.append({"name": "userId", "value": ENEBA_USER_ID})
    if ENEBA_ZONE_ID:
        extra.append({"name": "zoneId", "value": ENEBA_ZONE_ID})

    add_payload = {
        "operationName": "AddToCart",
        "variables": {
            "input": {
                "sellableSlug": auction["slug"],
                "currency": currency,
                "quantity": 1,
                "extraInfo": extra,
            },
            "currency": currency,
            "context": ctx,
            "abTests": [],
        },
        "extensions": {"persistedQuery": {"sha256Hash": assets["hashes"]["AddToCart"], "version": 1}},
    }

    r_add = s.post(GRAPHQL_ENDPOINT, json=add_payload, timeout=HTTP_TIMEOUT)
    if r_add.status_code != 200:
        raise RuntimeError(f"HTTP {r_add.status_code}: {r_add.text[:80]}")

    res_add = r_add.json()
    if res_add.get("errors"):
        raise RuntimeError(res_add["errors"][0].get("message", "AddToCart Error"))

    cart_data = (res_add.get("data") or {}).get("addToCart", {}).get("cart")
    total = _money(cart_data.get("totalPrice")) if cart_data else None
    cb = _money(cart_data.get("cashbackPrice")) if cart_data else 0.0

    if total is None or total <= 0:
        get_payload = {
            "operationName": "GetCart",
            "variables": {"context": ctx, "currency": currency},
            "extensions": {"persistedQuery": {"sha256Hash": assets["hashes"]["GetCart"], "version": 1}},
        }
        r_get = s.post(GRAPHQL_ENDPOINT, json=get_payload, timeout=HTTP_TIMEOUT)
        if r_get.status_code != 200:
            raise RuntimeError(f"GetCart HTTP {r_get.status_code}")

        res_get = r_get.json()
        cart = (res_get.get("data") or {}).get("cart") or {}
        total = _money(cart.get("totalPrice"))
        cb = _money(cart.get("cashbackPrice")) or 0.0

    if total is None or total <= 0:
        raise RuntimeError("Carrito vacío o sin totalPrice")

    # PRECIO DE CHECKOUT REAL (total cobrado en carrito, sin descontar cashback)
    return {
        "precio_checkout": f"{total:.2f}",
        "cashback_monto": f"{cb:.2f}" if cb else "0.00",
    }


def main() -> int:
    log.info("=" * 115)
    log.info(f" Eneba ML Diamonds Scraper -> PRECIOS REALES COBRADOS ({', '.join(CURRENCIES)}) VÍA SCRAPINGANT BR")
    log.info("=" * 115)

    try:
        assets = get_operation_assets()
        log.info(f"  OK Assets cargados | Build: {assets['version']}")
    except Exception as e:
        log.error(f"Error cargando assets de frontend: {e}")
        return 1

    data_by_currency: Dict[str, Dict[str, Dict[str, str]]] = {}
    nodes_by_currency: Dict[str, List[Dict[str, Any]]] = {}

    for cur in CURRENCIES:
        log.info(f"[FASE 1 - DIRECTO] Obteniendo catálogo en {cur}...")
        try:
            nodes = fetch_offers_direct(assets, cur)
            offers = parse_offers(nodes)
            data_by_currency[cur] = offers
            nodes_by_currency[cur] = nodes
            log.info(f"  OK {len(offers)} ofertas para {cur}")
        except Exception as e:
            log.error(f"  X Falló catálogo en {cur}: {e}")

    all_names: List[str] = []
    seen = set()
    for cur in CURRENCIES:
        for name in data_by_currency.get(cur, {}).keys():
            if name not in seen:
                seen.add(name)
                all_names.append(name)

    results: List[Dict[str, Any]] = []
    for name in all_names:
        row: Dict[str, Any] = {"Paquete": name}
        cb = ""
        for cur in CURRENCIES:
            info = data_by_currency.get(cur, {}).get(name, {})
            if not cb and info.get("Cashback_%"):
                cb = info["Cashback_%"]
            row[f"Precio_Catalogo_{cur}"] = info.get("Precio_Catalogo", "")
        row["Cashback_%"] = cb
        results.append(row)

    if SIMULATE_CHECKOUT:
        if not (ENEBA_USER_ID and ENEBA_ZONE_ID):
            log.warning("[FASE 3] Omitida: Define ENEBA_USER_ID y ENEBA_ZONE_ID al inicio del script.")
        else:
            targets = results[:CHECKOUT_LIMIT] if CHECKOUT_LIMIT else results
            log.info(f"[FASE 3 - SCRAPINGANT] Cotizando {len(targets)} paquetes en {CURRENCIES} vía Brasil...")

            node_map_by_cur = {
                cur: {(n.get("name") or "").strip(): n for n in nodes_by_currency.get(cur, [])}
                for cur in CURRENCIES
            }

            def _worker_task(item, cur):
                node = node_map_by_cur.get(cur, {}).get(item["Paquete"])
                if not node:
                    return item, cur, None
                name = item["Paquete"]
                time.sleep(CHECKOUT_DELAY)  # Espaciar peticiones: el free tier solo admite 1 a la vez
                for attempt in range(1, CHECKOUT_MAX_ATTEMPTS + 1):
                    try:
                        res = simulate_checkout_scrapingant(assets, node, cur)
                        log.info(f"  [OK] {name[:20]:<20} ({cur}) -> Cat: {item[f'Precio_Catalogo_{cur}']} | Chk: {res['precio_checkout']}")
                        return item, cur, res
                    except Exception as e:
                        if attempt == CHECKOUT_MAX_ATTEMPTS:
                            log.warning(f"  [X] {name[:20]:<20} ({cur}): {e}")
                        # Backoff progresivo: en 409 (concurrencia) espera más entre reintentos
                        time.sleep(3 * attempt if "409" in str(e) else 1)
                return item, cur, None

            tasks = [(item, cur) for cur in CURRENCIES for item in targets]
            with ThreadPoolExecutor(max_workers=CHECKOUT_WORKERS) as executor:
                futures = [executor.submit(_worker_task, item, cur) for item, cur in tasks]
                for fut in as_completed(futures):
                    item, cur, res = fut.result()
                    if res:
                        item[f"Precio_Checkout_{cur}"] = res["precio_checkout"]
                        item[f"Cashback_Checkout_{cur}"] = res["cashback_monto"]
                    else:
                        item[f"Precio_Checkout_{cur}"] = ""
                        item[f"Cashback_Checkout_{cur}"] = ""

    output = {
        "metadata": {
            "game": "mlbb",
            "target": TARGET_URL,
            "provider": "ScrapingAnt",
            "checkout_region": "BR",
            "currencies": CURRENCIES,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "total_packages": len(results),
        },
        "results": results,
    }
    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # -------------------------------------------------------------------
    # TABLA COMPARATIVA: PRECIOS REALES COBRADOS (SIN DESCONTAR CASHBACK)
    # -------------------------------------------------------------------
    log.info("\n" + "=" * 110)
    header = (
        f"{'Paquete':<28} | "
        f"{'R$ Cat':>7} | {'R$ Chk':>7} | "
        f"{'$ Cat':>6} | {'$ Chk':>6} | "
        f"{'€ Cat':>6} | {'€ Chk':>6} | "
        f"{'CB %':>5}"
    )
    log.info(header)
    log.info("-" * 110)

    for r in results:
        p_brl_cat = r.get("Precio_Catalogo_BRL") or "-"
        p_brl_chk = r.get("Precio_Checkout_BRL") or "-"
        p_usd_cat = r.get("Precio_Catalogo_USD") or "-"
        p_usd_chk = r.get("Precio_Checkout_USD") or "-"
        p_eur_cat = r.get("Precio_Catalogo_EUR") or "-"
        p_eur_chk = r.get("Precio_Checkout_EUR") or "-"
        cb = (r.get("Cashback_%") or "0") + "%"

        line = (
            f"{r['Paquete'][:28]:<28} | "
            f"{p_brl_cat:>7} | {p_brl_chk:>7} | "
            f"{p_usd_cat:>6} | {p_usd_chk:>6} | "
            f"{p_eur_cat:>6} | {p_eur_chk:>6} | "
            f"{cb:>5}"
        )
        log.info(line)

    log.info("=" * 110)
    log.info(f"Proceso completado. Guardado en {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())