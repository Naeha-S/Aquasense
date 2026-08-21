import json
from typing import List, Dict, Any
from pystac_client import Client

class EODataIngestor:
    """
    Ingests Earth Observation data from the Microsoft Planetary Computer STAC API.
    Handles temporal filtering, spatial intersection, and metadata standardization.
    """
    
    STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
    
    def __init__(self):
        self.client = Client.open(self.STAC_API_URL)
        
    def query_sentinel2(
        self, 
        bbox: List[float], 
        start_date: str, 
        end_date: str, 
        max_cloud_cover: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Queries for Sentinel-2 L2A assets using bounding box and date range constraints.
        
        Args:
            bbox (List[float]): [min_lon, min_lat, max_lon, max_lat]
            start_date (str): YYYY-MM-DD
            end_date (str): YYYY-MM-DD
            max_cloud_cover (int): Maximum allowable cloud coverage percentage.
            
        Returns:
            List[Dict[str, Any]]: Standardized internal format containing CRS, 
                                  cloud coverage, spectral bands, and asset URLs.
        """
        datetime_range = f"{start_date}/{end_date}"
        
        search = self.client.search(
            collections=["sentinel-2-l2a"],
            bbox=bbox,
            datetime=datetime_range,
            query={"eo:cloud_cover": {"lt": max_cloud_cover}}
        )
        
        results = []
        for item in search.items():
            properties = item.properties
            assets = item.assets
            
            # Dynamically extract available spectral bands (e.g., B02, B03, B04, B8A)
            bands = [k for k in assets.keys() if k.startswith("B") and len(k) <= 3]
            
            # Extract Coordinate Reference System, safely defaulting to WGS84
            crs_code = properties.get("proj:epsg")
            crs_str = f"EPSG:{crs_code}" if crs_code else "EPSG:4326"
            
            # Standardize output structure
            metadata = {
                "id": item.id,
                "acquisition_date": properties.get("datetime"),
                "cloud_coverage": properties.get("eo:cloud_cover", 0),
                "crs": crs_str,
                "bbox": item.bbox,
                "tile_identifier": properties.get("s2:mgrs_tile"),
                "bands": bands,
                "asset_urls": {key: asset.href for key, asset in assets.items() if hasattr(asset, 'href')},
                "cloud_mask_url": assets.get("SCL").href if "SCL" in assets else None
            }
            results.append(metadata)
            
        return results

if __name__ == "__main__":
    # Example execution: Pallikaranai Marsh, IN
    ingestor = EODataIngestor()
    test_bbox = [80.20, 12.91, 80.23, 12.95]
    print(f"Instantiated EODataIngestor. Querying MPC STAC API for bbox: {test_bbox}")
    
    try:
        data = ingestor.query_sentinel2(
            bbox=test_bbox,
            start_date="2025-01-01",
            end_date="2025-02-28",
            max_cloud_cover=30
        )
        print(f"Found {len(data)} valid scenes.")
        if data:
            print("Extracted Standardized Metadata (Latest Scene):")
            print(json.dumps(data[0], indent=2))
    except Exception as e:
        print(f"Data ingestion pipeline failed: {e}")
