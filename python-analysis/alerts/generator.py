"""Alert Generation — Threshold + Prediction based alerts."""

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AlertGenerator:
    def generate(self, df: pd.DataFrame, severity_model=None, forecaster=None) -> list:
        """Generate alerts from data analysis + model predictions."""
        alerts = []

        if df.empty:
            return [{'title': 'No Data Available', 'description': 'Upload accident data to enable AI alerts.', 'severity': 'info', 'type': 'system'}]

        try:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        except Exception:
            pass

        # ── 1. Spike Detection ──
        try:
            today = datetime.utcnow().date()
            recent = df[df['timestamp'].dt.date >= (today - timedelta(days=1))]
            avg_7d = len(df[df['timestamp'].dt.date >= (today - timedelta(days=7))]) / 7.0

            if len(recent) > avg_7d * 1.5 and avg_7d > 0:
                pct = round(((len(recent) / avg_7d) - 1) * 100)
                alerts.append({
                    'title': '⚠️ Accident Spike Detected',
                    'description': f'Today\'s accidents are {pct}% above the 7-day average ({len(recent)} vs avg {avg_7d:.1f}/day)',
                    'severity': 'critical',
                    'type': 'threshold',
                })
        except Exception as e:
            logger.debug(f'Spike check error: {e}')

        # ── 2. Forecast Alert ──
        try:
            if forecaster:
                forecast_result = forecaster.forecast(df, days=3)
                if forecast_result.get('forecast'):
                    tomorrow = forecast_result['forecast'][0]
                    if tomorrow['predicted_count'] > 5:
                        alerts.append({
                            'title': '🔮 High Risk Predicted Tomorrow',
                            'description': f'ML model forecasts ~{tomorrow["predicted_count"]} accidents (range: {tomorrow["lower_bound"]}–{tomorrow["upper_bound"]})',
                            'severity': 'warning',
                            'type': 'prediction',
                        })
                    if forecast_result.get('trend') == 'increasing':
                        alerts.append({
                            'title': '📈 Rising Accident Trend',
                            'description': f'Accident counts are trending upward (slope: +{forecast_result["slope"]}/day)',
                            'severity': 'warning',
                            'type': 'trend',
                        })
        except Exception as e:
            logger.debug(f'Forecast alert error: {e}')

        # ── 3. Weather Correlation Alert ──
        try:
            if 'weather' in df.columns and 'severity' in df.columns:
                severity_map = {'minor': 1, 'moderate': 2, 'severe': 3, 'fatal': 4}
                df['_sev_num'] = df['severity'].map(severity_map)

                for weather in ['rain', 'fog', 'snow', 'sleet']:
                    weather_df = df[df['weather'] == weather]
                    if len(weather_df) >= 2:
                        avg_sev = weather_df['_sev_num'].mean()
                        overall_sev = df['_sev_num'].mean()
                        if avg_sev > overall_sev * 1.3:
                            pct = round(((avg_sev / overall_sev) - 1) * 100)
                            alerts.append({
                                'title': f'🌧️ {weather.capitalize()} Severity Alert',
                                'description': f'{weather.capitalize()} conditions linked to {pct}% higher accident severity ({len(weather_df)} incidents)',
                                'severity': 'warning',
                                'type': 'correlation',
                            })
        except Exception as e:
            logger.debug(f'Weather alert error: {e}')

        # ── 4. Hotspot Alert ──
        try:
            if 'latitude' in df.columns:
                recent_48h = df[df['timestamp'] >= (datetime.utcnow() - timedelta(hours=48))]
                if len(recent_48h) >= 3:
                    # Simple grid-based clustering
                    recent_48h['_lat_r'] = recent_48h['latitude'].round(2)
                    recent_48h['_lng_r'] = recent_48h['longitude'].round(2)
                    clusters = recent_48h.groupby(['_lat_r', '_lng_r']).size()
                    for (lat, lng), count in clusters.items():
                        if count >= 3:
                            alerts.append({
                                'title': f'📍 New Hotspot: ({lat}, {lng})',
                                'description': f'Detected {count} accidents in past 48 hours at this location',
                                'severity': 'critical',
                                'type': 'hotspot',
                            })
        except Exception as e:
            logger.debug(f'Hotspot alert error: {e}')

        # ── 5. Fatal Accident Alert ──
        try:
            recent_fatal = df[(df['severity'] == 'fatal') & (df['timestamp'] >= (datetime.utcnow() - timedelta(days=1)))]
            if len(recent_fatal) > 0:
                alerts.append({
                    'title': '🚨 Fatal Accident in Last 24h',
                    'description': f'{len(recent_fatal)} fatal accident(s) reported in the last 24 hours',
                    'severity': 'critical',
                    'type': 'fatal',
                })
        except Exception as e:
            logger.debug(f'Fatal alert error: {e}')

        # Sort critical first
        severity_order = {'critical': 0, 'warning': 1, 'info': 2}
        alerts.sort(key=lambda a: severity_order.get(a.get('severity', 'info'), 9))

        return alerts
