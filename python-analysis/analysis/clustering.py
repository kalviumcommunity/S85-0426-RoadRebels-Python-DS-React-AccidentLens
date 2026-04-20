"""DBSCAN Hotspot Clustering."""

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN


def detect_hotspot_clusters(df: pd.DataFrame, eps_km: float = 1.0, min_samples: int = 2) -> list:
    """Use DBSCAN to detect geographic accident clusters."""
    if df.empty or 'latitude' not in df.columns or 'longitude' not in df.columns:
        return []

    coords = df[['latitude', 'longitude']].dropna().values

    if len(coords) < min_samples:
        return []

    # Convert eps from km to approximate degrees (1 degree ≈ 111 km)
    eps_deg = eps_km / 111.0

    clustering = DBSCAN(eps=eps_deg, min_samples=min_samples, metric='haversine' if len(coords) > 50 else 'euclidean')

    # For haversine, need radians; for small datasets use euclidean
    labels = clustering.fit_predict(coords)

    clusters = []
    for label in set(labels):
        if label == -1:  # Noise
            continue

        mask = labels == label
        cluster_points = df.iloc[np.where(mask)[0]] if isinstance(df.index, pd.RangeIndex) else df[mask]

        center_lat = float(coords[mask, 0].mean())
        center_lng = float(coords[mask, 1].mean())

        severity_map = {'minor': 1, 'moderate': 2, 'severe': 3, 'fatal': 4}
        avg_severity = float(cluster_points['severity'].map(severity_map).mean()) if 'severity' in cluster_points.columns else 2.0

        clusters.append({
            'cluster_id': int(label),
            'center_lat': round(center_lat, 4),
            'center_lng': round(center_lng, 4),
            'accident_count': int(mask.sum()),
            'avg_severity': round(avg_severity, 2),
            'risk_score': round(avg_severity * mask.sum() / 4.0, 2),
            'radius_km': round(float(np.std(coords[mask, 0]) * 111), 2),
        })

    clusters.sort(key=lambda x: x['risk_score'], reverse=True)
    return clusters
