
from datetime import datetime, timezone
from typing import Optional

from pystac_client import Client
from shapely.geometry import shape

from common.config import STAC_API_URL, COLLECTIONS
from aoi.models import AreaOfInterest


class STACDiscoveryEngine:
    def __init__(self):
        self.catalog = Client.open(STAC_API_URL)

    @staticmethod
    def _get_observation_date(item):
        value = (
            item.properties.get("datetime")
            or item.properties.get("start_datetime")
        )

        return value

    def search_collection(
        self,
        collection_name: str,
        aoi: AreaOfInterest,
        start_date: str,
        end_date: str,
        max_items: Optional[int] = 500,
    ):
        if collection_name not in COLLECTIONS:
            raise ValueError(
                f"Unknown collection: {collection_name}"
            )

        collection_id = COLLECTIONS[collection_name]

        search = self.catalog.search(
            collections=[collection_id],
            intersects=aoi.geojson,
            datetime=f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
            max_items=max_items,
        )

        observations = []

        for item in search.items():
            # Additional exact geometry intersection check.
            if item.geometry:
                item_geometry = shape(item.geometry)

                if not item_geometry.intersects(aoi.geometry):
                    continue

            properties = item.properties

            observations.append({
                "source": properties.get("platform", "unknown"),
                "collection": collection_id,
                "item_id": item.id,
                "observation_datetime": self._get_observation_date(item),
                "aoi_name": aoi.name,
                "bbox": item.bbox,
                "assets": list(item.assets.keys()),
                "asset_metadata": {
                    key: {
                        "type": asset.media_type,
                        "roles": asset.roles,
                    }
                    for key, asset in item.assets.items()
                },
            })

        return observations

    def discover_all(
        self,
        aoi: AreaOfInterest,
        start_date: str,
        end_date: str,
        max_items: Optional[int] = 500,
    ):
        # Validate date inputs.
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        if start > end:
            raise ValueError("Start date must be before end date")

        results = {}

        for collection_name in COLLECTIONS:
            print(f"\nSearching {collection_name}...")

            try:
                observations = self.search_collection(
                    collection_name=collection_name,
                    aoi=aoi,
                    start_date=start_date,
                    end_date=end_date,
                    max_items=max_items,
                )

                results[collection_name] = {
                    "status": "success",
                    "count": len(observations),
                    "observations": observations,
                }

                print(f"Found {len(observations)} observations")

            except Exception as error:
                results[collection_name] = {
                    "status": "error",
                    "count": 0,
                    "observations": [],
                    "error": str(error),
                }

                print(f"Search failed: {error}")

        return results
