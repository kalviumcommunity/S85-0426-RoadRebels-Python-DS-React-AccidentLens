"""Accident Forecasting — Time Series Linear Trend."""

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)


class AccidentForecaster:
    def __init__(self):
        self.model = None

    def forecast(self, df: pd.DataFrame, days: int = 7) -> dict:
        """Forecast daily accident counts for the next N days."""
        if df.empty or 'timestamp' not in df.columns:
            return self._fallback_forecast(days)

        try:
            df['date'] = pd.to_datetime(df['timestamp']).dt.date
            daily = df.groupby('date').size().reset_index(name='count')
            daily['date'] = pd.to_datetime(daily['date'])
            daily = daily.sort_values('date')

            if len(daily) < 3:
                return self._fallback_forecast(days)

            # Create numeric features (day index)
            daily['day_idx'] = (daily['date'] - daily['date'].min()).dt.days

            X = daily['day_idx'].values.reshape(-1, 1)
            y = daily['count'].values

            # Linear regression
            self.model = LinearRegression()
            self.model.fit(X, y)

            # Historical stats for confidence bounds
            std = float(np.std(y))
            mean = float(np.mean(y))

            # Forecast future days
            last_day = daily['day_idx'].max()
            forecast_points = []
            for d in range(1, days + 1):
                future_x = np.array([[last_day + d]])
                pred = float(self.model.predict(future_x)[0])
                pred = max(0, pred)  # No negative forecasts

                future_date = daily['date'].max() + timedelta(days=d)
                forecast_points.append({
                    'date': future_date.strftime('%Y-%m-%d'),
                    'predicted_count': round(pred, 1),
                    'lower_bound': round(max(0, pred - 1.96 * std), 1),
                    'upper_bound': round(pred + 1.96 * std, 1),
                })

            # Trend analysis
            slope = float(self.model.coef_[0])
            trend = 'increasing' if slope > 0.05 else 'decreasing' if slope < -0.05 else 'stable'

            return {
                'forecast': forecast_points,
                'trend': trend,
                'slope': round(slope, 4),
                'avg_daily': round(mean, 1),
                'std_daily': round(std, 1),
                'model': 'linear_regression',
                'training_days': len(daily),
                'r2_score': round(float(self.model.score(X, y)), 3),
            }

        except Exception as e:
            logger.error(f'Forecast error: {e}')
            return self._fallback_forecast(days)

    def _fallback_forecast(self, days: int) -> dict:
        """Simple fallback forecast."""
        base = 3.5
        return {
            'forecast': [
                {
                    'date': (datetime.utcnow() + timedelta(days=d)).strftime('%Y-%m-%d'),
                    'predicted_count': round(base + np.random.normal(0, 0.8), 1),
                    'lower_bound': round(max(0, base - 2), 1),
                    'upper_bound': round(base + 3, 1),
                }
                for d in range(1, days + 1)
            ],
            'trend': 'stable',
            'model': 'fallback',
            'avg_daily': base,
        }
