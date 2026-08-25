import itertools
import random

import pandas as pd
import tqdm

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.shtuff.data_handler import DataHandler
from warframe_marketplace_predictor.shtuff.storage_handling import read_json


def create_df() -> None:
    """Creates a dataframe from raw marketplace data and saves it as a CSV."""
    df_rows = []

    # Load raw marketplace data
    marketplace_data = read_json(raw_marketplace_data_file_path)

    # Convert marketplace data into a pandas dataframe of listings
    pbar = tqdm.tqdm(marketplace_data, desc="Listings processed", unit="listing", total=len(marketplace_data))
    for listing in pbar:
        df_row = dict()

        # Extract listing details
        df_row["id"] = listing["id"]
        df_row["created"] = listing["created"]
        df_row["captured_date"] = listing.get("captured_date")

        item = listing["item"]
        df_row["weapon_url_name"] = item["weapon_url_name"]
        df_row["polarity"] = item["polarity"]
        df_row["mod_rank"] = item["mod_rank"]
        df_row["re_rolls"] = item["re_rolls"]
        df_row["re_rolled"] = item["re_rolls"] > 0
        df_row["master_level"] = item["mastery_level"]

        # Get riven attribute names and values
        attributes = item["attributes"]
        attribute_names = {"positive1": None, "positive2": None, "positive3": None, "negative": None}
        attribute_values = {"positive1_value": None, "positive2_value": None, "positive3_value": None,
                            "negative_value": None}
        i = 1
        for attribute in attributes:
            if attribute["positive"]:
                attribute_names[f"positive{i}"] = attribute["url_name"]
                attribute_values[f"positive{i}_value"] = attribute["value"]
                i += 1
            else:
                attribute_names["negative"] = attribute["url_name"]
                attribute_values["negative_value"] = attribute["value"]
        df_row.update(attribute_names)
        df_row.update(attribute_values)

        # Get prices associated with the riven
        df_row["is_direct_sell"] = listing["is_direct_sell"]
        df_row["starting_price"] = listing["starting_price"]
        df_row["buyout_price"] = listing["buyout_price"]
        df_rows.append(df_row)

    # Save dataframe to CSV
    df = pd.DataFrame(df_rows)
    df.to_csv(marketplace_dataframe_file_path, index=False)

    print(f"Marketplace dataframe created.")
    print(f"Total (rows, cols): {df.shape}\n")


def add_days_listed_and_has_sold_columns():
    """
    Adds a 'days_listed' column to the marketplace dataframe, which is calculated as the difference in days
    between 'captured_date' and 'created'. Handles cases where 'captured_date' is None by setting 'days_since_capture'
    to NaN for those entries. Also adds a 'has_sold' column based on whether 'captured_date' is less than the most
    recent 'captured_date'.

    'captured_date' is of the format: datetime.date.today().isoformat()
    'created' is of the format: 2024-09-22T15:41:54.000+00:00
    """
    # Load the existing dataframe
    df = pd.read_csv(marketplace_dataframe_file_path)

    # Convert 'created' to datetime, ensuring to parse the timezone information
    df['created'] = pd.to_datetime(df['created'], format="%Y-%m-%dT%H:%M:%S.%f%z", errors='coerce')

    # Convert 'captured_date' to datetime and make it timezone-naive (remove tz info)
    df['captured_date'] = pd.to_datetime(df['captured_date'], format="%Y-%m-%d", errors='coerce')

    # Remove timezone information from 'created' to make both columns tz-naive
    df['created'] = df['created'].dt.tz_localize(None)

    # Calculate 'days_since_capture' only for rows with non-null 'captured_date'
    df['days_listed'] = (df['captured_date'] - df['created'].dt.floor('D')).dt.days

    # Find the most recent capture date
    most_recent_capture_date = df['captured_date'].max()

    # Add 'has_sold' column based on whether 'captured_date' is less than the most recent capture date
    df['has_sold'] = df['captured_date'] < most_recent_capture_date  # TODO: Improve from naive solution

    # Save the updated dataframe
    df.to_csv(marketplace_dataframe_file_path, index=False)

    print(f"Columns 'days_listed' and 'has_sold' added to the dataframe.")
    print(f"Total (rows, cols): {df.shape}\n")


def handle_prices() -> None:
    """
    Consolidates the starting and buyout prices into a single price.

    Filters out users who set unrealistic pricing, such as infinite maximum bids or excessively large spreads between starting and buyout prices.
    The goal is to return a dataset of more reasonable and focused price estimates.
    """
    df = pd.read_csv(marketplace_dataframe_file_path)
    original_size = df.shape[0]
    df = df.dropna(subset=["buyout_price"])  # Drop rows with None buyout_price
    df = df[(df["buyout_price"] >= 10) & (df["buyout_price"] <= 10_000)]  # Keep rows with 10 <= buyout_price <= 10,000
    # df = df[df["buyout_price"] <= 5 * df["starting_price"]]
    df = df[df["is_direct_sell"] == True]
    df["listing_price"] = df["buyout_price"]  # Use buyout_price as the listing price
    df.to_csv(marketplace_dataframe_file_path, index=False)

    print(f"Column 'listing_price' added to the dataframe.")
    print(f"Dropped {original_size - df.shape[0]} invalidly priced rows.")
    print(f"Total (rows, cols): {df.shape}\n")


def _WIP_create_estimated_trade_price() -> None:
    """
    Attempts to shift the listed price distribution to more accurately reflect the traded price distribution.

    Note: This function is a work in progress and may not be fully functional.
    """
    # Read the data files
    df = pd.read_csv(marketplace_dataframe_file_path)
    developer_summary_statistics = read_json(developer_summary_stats_file_path)

    # Get unique weapon names
    weapon_names = df["weapon_url_name"].unique()

    results = []
    for weapon_name in weapon_names:
        weapon_listings = df[df["weapon_url_name"] == weapon_name]
        listing_prices = weapon_listings["listing_price"]
        if weapon_name in developer_summary_statistics:
            traded_summary_statistics = developer_summary_statistics[weapon_name]["combined_stats"]
            estimated_trade_prices = adjust_values(listing_prices, traded_summary_statistics)
            results.append((weapon_name, estimated_trade_prices))
        else:
            print("Warning:", weapon_name, "does not exist in developer summary statistics.")
            results.append((weapon_name, listing_prices))

    # Update the dataframe with the estimated trade prices
    for weapon_name, estimated_trade_prices in results:
        df.loc[df["weapon_url_name"] == weapon_name, "estimated_trade_price"] = estimated_trade_prices

    # Save the updated dataframe
    df.to_csv(marketplace_dataframe_file_path, index=False)
    print("Estimated trade price added via the traded summary statistics.")


def add_supplementary_weapon_information() -> None:
    """
    Adds supplementary information to the marketplace weapon data CSV file.

    This function reads weapon data from a CSV, adds additional columns for:
    - Weapon Group: Categorizes the weapon.
    - Disposition: A value representing the weapon's disposition.
    - Incarnon Status: Boolean indicating if the weapon has Incarnon capabilities.
    - Average Trade Price: The average trade price of the weapon considering its reroll status.

    It then saves the updated data back to the CSV file.
    """
    # Load the CSV data
    df = pd.read_csv(marketplace_dataframe_file_path)

    # Instantiate DataHandler for accessing supplementary data
    data_handler = DataHandler()

    # Apply tqdm to the iteration
    tqdm.tqdm.pandas(desc="Adding supplementary data", unit="listing")

    # Define a function to process each row
    def process_row(row):
        x = row["weapon_url_name"]
        rerolled = "rerolled" if row["re_rolled"] else "unrolled"
        group = data_handler.get_weapon_group(x)
        disposition = data_handler.get_disposition(x)
        has_incarnon = data_handler.weapon_has_incarnon(x)
        avg_trade_price = data_handler.get_average_trade_price(x, rolled_status=rerolled)

        return pd.Series({
            "group": group,
            "disposition": disposition,
            "has_incarnon": has_incarnon,
            "avg_trade_price": avg_trade_price
        })

    # Apply the function to each row
    supplementary_data = df.progress_apply(process_row, axis=1)

    # Concatenate the supplementary data with the original data
    df = pd.concat([df, supplementary_data], axis=1)

    # Save the updated dataframe back to CSV
    df.to_csv(marketplace_dataframe_file_path, index=False)

    print("Added supplementary weapon information: Weapon Group, Disposition, Incarnon, and Average Trade Price.")
    print(f"Total (rows, cols): {df.shape}\n")


def add_permutation_data() -> None:
    """
    Generates and adds permutation data for weapons to the marketplace weapon data CSV file.

    This function reads weapon data from a specified CSV file, creates new rows based on the positive attributes of each weapon,
    and ensures that the generated permutations do not result in duplicates. It skips permutations where at least two of the positive
    attributes are elemental damages, avoiding excessive elemental combinations.

    A random factor is introduced to control the volume of new data generated, allowing for the addition of
    artificial entries without overwhelming the dataset.
    """
    random.seed(42)
    EXTRA_ARTIFICIAL_DATA_FACTOR = 0.1

    # Load the CSV data
    df = pd.read_csv(marketplace_dataframe_file_path)

    new_rows = []
    elemental_attributes = ["heat_damage", "cold_damage", "electric_damage", "toxin_damage"]

    pbar = tqdm.tqdm(total=len(df), desc="Permuting attributes", unit="listing")

    for index, row in df.iterrows():
        if random.random() > EXTRA_ARTIFICIAL_DATA_FACTOR:
            pbar.update(1)
            pbar.set_postfix(added_permutations=len(new_rows))
            continue

        positive_attributes = [row["positive1"], row["positive2"], row["positive3"]]
        positive_attributes = [x for x in positive_attributes if not pd.isna(x)]

        # Skip if at least two positives are elemental
        if sum(attr in elemental_attributes for attr in positive_attributes) >= 2:
            pbar.update(1)
            continue

        for positive_attribute_perm in itertools.permutations(positive_attributes):
            new_row = row.copy()

            # Update the new row with the new positive attributes
            for i in range(len(positive_attribute_perm)):
                new_row[f"positive{i + 1}"] = positive_attribute_perm[i]

            new_rows.append(new_row)

        pbar.update(1)  # Update progress bar

    # Convert new_rows to a DataFrame and concatenate with original data
    new_rows_df = pd.DataFrame(new_rows)
    df = pd.concat([df, new_rows_df], ignore_index=True)

    # Save the updated dataframe back to CSV
    df.to_csv(marketplace_dataframe_file_path, index=False)

    print(f"Artificial permutation data created.")
    print(f"New rows added: {len(new_rows)}")
    print(f"Total (rows, cols): {df.shape}\n")


def remove_duplicate_rows() -> None:
    """
    Removes duplicate rows from the marketplace weapon data CSV file.

    This function reads the existing CSV data, drops any duplicate rows,
    and saves the cleaned data back to the CSV file.
    """
    # Load the CSV data
    df = pd.read_csv(marketplace_dataframe_file_path)
    original_size = df.shape[0]

    # Remove duplicate rows based on weapon attributes
    cleaned_data = df.drop_duplicates(subset=[
        "weapon_url_name", "polarity", "mod_rank", "re_rolls",
        "positive1", "positive2", "positive3",
        "negative",
        "positive1_value", "positive2_value", "positive3_value",
        "negative_value",
    ])

    # Save the cleaned dataframe back to CSV
    cleaned_data.to_csv(marketplace_dataframe_file_path, index=False)

    print(f"Duplicate rows removed.")
    print(f"Removed {original_size - cleaned_data.shape[0]} rows.")
    print(f"Total (rows, cols): {cleaned_data.shape}\n")


def minor_final_adjustments():
    """
    Performs minor final adjustments to the dataset.

    This function shuffles the dataset to ensure that the data is in random order.
    """
    df = pd.read_csv(marketplace_dataframe_file_path)

    # Shuffle dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    df.to_csv(marketplace_dataframe_file_path, index=False)

    print("Final touches done.")
    print(f"Total (rows, cols): {df.shape}\n")


def main():
    running = [
        {"run": True, "func": create_df},
        {"run": False, "func": add_days_listed_and_has_sold_columns},
        {"run": True, "func": handle_prices},
        {"run": False, "func": _WIP_create_estimated_trade_price},  # Function is under development
        {"run": False, "func": add_supplementary_weapon_information},
        {"run": False, "func": add_permutation_data},
        {"run": True, "func": remove_duplicate_rows},
        {"run": True, "func": minor_final_adjustments},
    ]

    for action in running:
        if action["run"]:
            action["func"]()

    print("You may now train the model.")


if __name__ == "__main__":
    main()
