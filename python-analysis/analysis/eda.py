"""EDA — Exploratory Data Analysis functions."""

import numpy as np
import pandas as pd


def run_eda_summary(df: pd.DataFrame) -> dict:
    """Generate summary statistics for the accident dataset."""
    result = {
        'total_accidents': len(df),
        'date_range': {
            'start': str(df['timestamp'].min()) if 'timestamp' in df.columns else None,
            'end': str(df['timestamp'].max()) if 'timestamp' in df.columns else None,
        },
        'avg_injured': round(float(df['injured_count'].mean()), 2) if 'injured_count' in df.columns else 0,
        'total_injured': int(df['injured_count'].sum()) if 'injured_count' in df.columns else 0,
        'avg_vehicles': round(float(df['vehicle_count'].mean()), 2) if 'vehicle_count' in df.columns else 0,
        'avg_speed_limit': round(float(df['speed_limit'].mean()), 1) if 'speed_limit' in df.columns else 0,
        'most_common_severity': df['severity'].mode().iloc[0] if 'severity' in df.columns and len(df) > 0 else None,
        'most_common_weather': df['weather'].mode().iloc[0] if 'weather' in df.columns and len(df) > 0 else None,
        'most_common_road_type': df['road_type'].mode().iloc[0] if 'road_type' in df.columns and len(df) > 0 else None,
    }

    # Numeric column stats
    numeric_stats = {}
    for col in ['injured_count', 'vehicle_count', 'speed_limit', 'latitude', 'longitude']:
        if col in df.columns:
            s = df[col].dropna()
            numeric_stats[col] = {
                'mean': round(float(s.mean()), 2),
                'median': round(float(s.median()), 2),
                'std': round(float(s.std()), 2),
                'min': round(float(s.min()), 2),
                'max': round(float(s.max()), 2),
                'q25': round(float(s.quantile(0.25)), 2),
                'q75': round(float(s.quantile(0.75)), 2),
            }
    result['numeric_stats'] = numeric_stats

    return result


def run_eda_distributions(df: pd.DataFrame) -> dict:
    """Generate value distributions for categorical and temporal features."""
    result = {}

    # Categorical distributions
    for col in ['severity', 'weather', 'road_type', 'road_condition', 'visibility', 'status']:
        if col in df.columns:
            counts = df[col].value_counts().reset_index()
            counts.columns = ['name', 'count']
            result[col] = counts.to_dict('records')

    # Hour of day distribution
    if 'timestamp' in df.columns:
        df['_hour'] = pd.to_datetime(df['timestamp']).dt.hour
        hour_counts = df.groupby('_hour').size().reset_index(name='count')
        hour_counts.columns = ['hour', 'count']
        result['hour_of_day'] = hour_counts.to_dict('records')

        # Day of week
        df['_dow'] = pd.to_datetime(df['timestamp']).dt.day_name()
        dow_counts = df['_dow'].value_counts().reset_index()
        dow_counts.columns = ['day', 'count']
        result['day_of_week'] = dow_counts.to_dict('records')

    return result
