import datetime
import time
from typing import Dict

import requests
import tqdm

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.shtuff.data_handler import DataHandler
from warframe_marketplace_predictor.shtuff.storage_handling import save_json, read_json


# If anything breaks, surely it was a cosmic bit flip.
#
# NOTE: Warframe Market migrated from v1 (https://api.warframe.market/v1/) to
# v2 (https://api.warframe.market/v2/).  The old v1 endpoints /riven/items and
# /riven/attributes now return 404.  The v2 equivalents are:
#   v1/riven/items      -> v2/riven/weapons
#   v1/riven/attributes -> v2/riven/attributes
# The v1/auctions/search endpoint still works for fetching live riven auction
# listings, so that path is unchanged.


def fetch_data(url: str, delay: float = 0.1, timeout: float = 30.0) -> Dict:
    """
    Fetches data from a given URL, with retries in case of rate limiting or failure.

    Args:
        url (str): The API endpoint to fetch data from.
        delay (float): The delay in seconds before retrying on rate limits. Defaults to 0.1.
        timeout (float): Request timeout in seconds. Defaults to 30.0.

    Returns:
        Dict: JSON data fetched from the API or an empty dictionary in case of an error.
    """
    if delay >= 3.0:
        print(f"Delay limit reached. Aborting {url}")
        return dict()

    try:
        response = requests.get(url, headers={"accept": "application/json"}, timeout=timeout)
        # Handle rate-limiting (status code 429)
        if response.status_code == 429:  # Too Many Requests
            print("Rate limited. Retrying...")
            time.sleep(delay)
            return fetch_data(url, min(60.0, delay * 2), timeout)

        # Handle HTTP errors
        response.raise_for_status()
        return response.json()

    except requests.exceptions.HTTPError as err:
        print(f"HTTP error occurred: {err}")
    except requests.exceptions.RequestException as err:
        print(f"Error occurred: {err}")

    return dict()  # Fallback in case of any error


def download_items_data(the_url: str = "https://api.warframe.market/v2/riven/weapons") -> None:
    """
    Downloads riven-capable weapon data from the API and saves mappings between
    item names and their URL representations.

    Uses the v2 riven weapons endpoint. Each entry is normalised to the field
    shape expected by DataHandler.load_items() (item_name, url_name, group).
    Extra v2 fields (disposition, rivenType, etc.) are preserved for downstream
    consumers.

    Args:
        the_url (str): The API endpoint to fetch item data from.
    """
    raw = fetch_data(the_url)
    items_data = raw.get("data", []) if isinstance(raw, dict) else []
    item_name_items_data = {}
    for x in items_data:
        url_name = x.get("slug", "")
        item_name = x.get("i18n", {}).get("en", {}).get("name", url_name)
        # Normalise to the field names the rest of the pipeline expects
        normalised = {
            "item_name": item_name,
            "url_name": url_name,
            "group": x.get("group", ""),
            "thumbnail": None,
        }
        # Preserve any additional v2 fields (disposition, rivenType, etc.)
        normalised.update({k: v for k, v in x.items()
                           if k not in ("slug", "i18n") and k not in normalised})
        item_name_items_data[item_name] = normalised

    save_json(items_data_file_path, item_name_items_data)
    print(f"Downloaded and saved items data ({len(item_name_items_data)} weapons).\n")


def download_attributes_data(the_url: str = "https://api.warframe.market/v2/riven/attributes") -> None:
    """
    Downloads attribute data from the API and saves it.

    Uses the v2 riven attributes endpoint. Each entry is normalised to the field
    shape expected by DataHandler.load_attributes() and the downstream
    effect_to_url mapping in export_to_onnx.py (url_name, effect).

    If a local attributes_data.json already exists with richer v1 fields
    (e.g. units, negative_only), those are preserved and only url_name/effect
    are refreshed from the v2 source.

    Args:
        the_url (str): The API endpoint to fetch attribute data from.
    """
    raw = fetch_data(the_url)
    attributes_data = raw.get("data", []) if isinstance(raw, dict) else []

    # Normalise v2 entries to the v1-compatible shape (url_name, effect)
    normalised = {}
    for x in attributes_data:
        url_name = x.get("slug", "")
        if url_name in ("has", "none", ""):
            continue
        normalised[url_name] = {
            "url_name": url_name,
            "effect": x.get("i18n", {}).get("en", {}).get("name", url_name),
            "group": x.get("group", "default"),
            "prefix": x.get("prefix", ""),
            "suffix": x.get("suffix", ""),
            "id": x.get("id", ""),
        }

    # Merge with existing data to preserve v1-only fields (units, negative_only,
    # exclusive_to, positive_only, search_only, etc.) that downstream code relies on
    existing = read_json(attributes_data_file_path) if isinstance(read_json(attributes_data_file_path), dict) else {}
    merged = {}
    for url_name, entry in normalised.items():
        base = existing.get(url_name, {})
        base.update({
            "url_name": url_name,
            "effect": entry["effect"],
            "group": entry["group"],
            "prefix": entry["prefix"],
            "suffix": entry["suffix"],
            "id": entry["id"],
        })
        merged[url_name] = base

    save_json(attributes_data_file_path, merged)
    print(f"Downloaded and saved attributes data ({len(merged)} attributes).\n")


def download_marketplace_database(overwrite: bool = True) -> None:
    """
    Downloads marketplace data and saves the raw data to a file.

    Args:
        overwrite (bool): If True, it downloads a fresh batch. If False, will update and append to existing data.
    """
    if overwrite:
        auctions_data = dict()
        original_length = 0
    else:
        auctions = read_json(raw_marketplace_data_file_path)
        auctions_data = {auction["id"]: auction for auction in auctions}
        original_length = len(auctions_data)

    captured_date = datetime.date.today().isoformat()
    weapon_url_names = DataHandler().get_url_names()

    price_orderings = ["price_asc", "price_desc"]
    pbar = tqdm.tqdm(weapon_url_names, "Fetching Marketplace Data", unit="weapon")
    for weapon_name in pbar:
        pbar.set_postfix(weapon=weapon_name, added=len(auctions_data) - original_length)
        for price_ordering in price_orderings:
            the_url = f"https://api.warframe.market/v1/auctions/search?type=riven"
            the_url += f"&weapon_url_name={weapon_name}"
            the_url += f"&sort_by={price_ordering}"
            try:
                fetched = fetch_data(the_url)
                auctions = fetched["payload"]["auctions"] if isinstance(fetched, dict) else []
            except (KeyError, TypeError) as e:
                print(e)
                print(f"Skipping {weapon_name}_{price_ordering}...")
                continue
            for auction in auctions:
                auction["captured_date"] = captured_date  # Add the date to each auction
            id_auctions = {auction["id"]: auction for auction in auctions}
            auctions_data.update(id_auctions)

    auctions_data = list(auctions_data.values())
    save_json(raw_marketplace_data_file_path, auctions_data)

    print("Marketplace data saved.")
    print(f"{len(auctions_data)} total entries.\n")


def download_developer_riven_summary_stats(the_url: str = "https://api.warframestat.us/pc/rivens"):
    """
    Downloads and processes summary statistics for traded Rivens from the provided API, then saves the data.
    The data is organized into a dictionary with weapon names as keys and a dictionary containing rolled, unrolled,
    and combined statistics as values.

    Args:
        the_url (str): The URL of the API endpoint to retrieve Riven statistics. Defaults to the official
                       Warframe Rivens API for the PC platform.
    """
    # Fetch Riven summary statistics data from the API.
    riven_stats_data = fetch_data(the_url)

    # Save the reformatted Riven statistics to a JSON file.
    save_json(developer_summary_stats_file_path, riven_stats_data)

    print("Downloaded and saved Riven summary statistics.\n")


def download_ingame_weapon_stats(the_url: str = "https://api.warframestat.us/weapons"):
    # Fetch weapon statistics data from the API.
    ig_weapon_stats = fetch_data(the_url)

    ig_data = dict()
    for weapon in ig_weapon_stats:
        name = weapon["name"]
        undesired_keys = ["patchlogs", "components"]
        weapon = {k: weapon[k] for k in sorted(weapon.keys()) if k not in undesired_keys}
        ig_data[name] = weapon

    save_json(ig_weapon_stats_file_path, ig_data)

    print("Downloaded and saved in-game weapon stats.\n")


def main(running_all: bool = False, overwrite_marketplace_data: bool = False):
    """
    Downloads all the data you'll need from the interweb.
    """
    running = [
        {"run": True, "func": download_items_data},
        {"run": True, "func": download_attributes_data},
        {"run": True, "func": lambda: download_marketplace_database(overwrite=overwrite_marketplace_data)},
        {"run": True, "func": download_developer_riven_summary_stats},
        {"run": True, "func": download_ingame_weapon_stats},
    ]

    for action in running:
        if running_all or action["run"]:
            action["func"]()


if __name__ == "__main__":
    main(running_all=False, overwrite_marketplace_data=True)
