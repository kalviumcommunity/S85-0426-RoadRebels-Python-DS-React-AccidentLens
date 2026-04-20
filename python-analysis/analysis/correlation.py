"""Correlation Engine — Pearson, Spearman, Chi-Square."""

import numpy as np
import pandas as pd
from scipy import stats


def compute_full_correlations(df: pd.DataFrame) -> dict:
    """Compute correlation matrix between all relevant variable pairs."""

    # Encode categorical variables as numeric
    encoding = {
        'severity': {'minor': 1, 'moderate': 2, 'severe': 3, 'fatal': 4},
        'weather': {'clear': 1, 'rain': 2, 'fog': 3, 'snow': 4, 'sleet': 5},
        'road_type': {'urban': 1, 'rural': 2, 'highway': 3},
        'road_condition': {'dry': 1, 'wet': 2, 'icy': 3, 'debris': 4},
        'visibility': {'good': 1, 'poor': 2, 'very_poor': 3},
    }

    df_enc = df.copy()
    for col, mapping in encoding.items():
        if col in df_enc.columns:
            df_enc[col + '_num'] = df_enc[col].map(mapping).fillna(0)

    # Add temporal features
    if 'timestamp' in df_enc.columns:
        df_enc['hour'] = pd.to_datetime(df_enc['timestamp']).dt.hour
        df_enc['day_of_week'] = pd.to_datetime(df_enc['timestamp']).dt.dayofweek

    # Variable pairs to correlate
    pairs = [
        ('weather_num', 'severity_num', 'weather', 'severity'),
        ('road_condition_num', 'severity_num', 'road_condition', 'severity'),
        ('visibility_num', 'severity_num', 'visibility', 'severity'),
        ('speed_limit', 'severity_num', 'speed_limit', 'severity'),
        ('hour', 'severity_num', 'hour', 'severity'),
        ('weather_num', 'road_condition_num', 'weather', 'road_condition'),
        ('vehicle_count', 'injured_count', 'vehicle_count', 'injured_count'),
        ('speed_limit', 'injured_count', 'speed_limit', 'injured_count'),
    ]

    matrix = []
    for num1, num2, label1, label2 in pairs:
        if num1 in df_enc.columns and num2 in df_enc.columns:
            s1 = df_enc[num1].dropna()
            s2 = df_enc[num2].dropna()
            common = s1.index.intersection(s2.index)
            if len(common) >= 3:
                try:
                    pearson_r, pearson_p = stats.pearsonr(s1[common], s2[common])
                    spearman_r, spearman_p = stats.spearmanr(s1[common], s2[common])
                except Exception:
                    pearson_r, pearson_p = 0.0, 1.0
                    spearman_r, spearman_p = 0.0, 1.0

                matrix.append({
                    'var1': label1,
                    'var2': label2,
                    'value': round(float(abs(pearson_r)), 3),
                    'pearson': round(float(pearson_r), 3),
                    'pearson_p': round(float(pearson_p), 4),
                    'spearman': round(float(spearman_r), 3),
                    'spearman_p': round(float(spearman_p), 4),
                    'sample_size': len(common),
                    'significance': 'significant' if pearson_p < 0.05 else 'not_significant',
                })

    # Chi-Square tests on categorical pairs
    chi_pairs = [('weather', 'severity'), ('road_type', 'severity'), ('visibility', 'severity')]
    chi_results = []
    for col1, col2 in chi_pairs:
        if col1 in df.columns and col2 in df.columns:
            ct = pd.crosstab(df[col1], df[col2])
            if ct.shape[0] > 1 and ct.shape[1] > 1:
                chi2, p, dof, expected = stats.chi2_contingency(ct)
                chi_results.append({
                    'var1': col1,
                    'var2': col2,
                    'chi2': round(float(chi2), 3),
                    'p_value': round(float(p), 4),
                    'dof': int(dof),
                    'significant': p < 0.05,
                })

    # Sort by absolute correlation value
    matrix.sort(key=lambda x: abs(x['value']), reverse=True)

    return {
        'matrix': matrix,
        'chi_square': chi_results,
        'method': 'pearson+spearman+chi2',
        'sample_size': len(df),
    }
