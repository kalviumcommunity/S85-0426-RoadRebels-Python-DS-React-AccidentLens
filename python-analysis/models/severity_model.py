"""Severity Prediction Model — Random Forest Classifier."""

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)


class SeverityPredictor:
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.feature_cols = ['weather', 'road_type', 'road_condition', 'visibility', 'speed_limit', 'vehicle_count', 'hour', 'day_of_week']
        self.metrics = None

    def _encode_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical features for model input."""
        df_enc = df.copy()

        categorical = ['weather', 'road_type', 'road_condition', 'visibility']
        for col in categorical:
            if col in df_enc.columns:
                if col not in self.encoders:
                    self.encoders[col] = LabelEncoder()
                    df_enc[col] = self.encoders[col].fit_transform(df_enc[col].astype(str))
                else:
                    # Handle unseen labels
                    known = set(self.encoders[col].classes_)
                    df_enc[col] = df_enc[col].astype(str).apply(lambda x: x if x in known else 'unknown')
                    if 'unknown' not in self.encoders[col].classes_:
                        self.encoders[col].classes_ = np.append(self.encoders[col].classes_, 'unknown')
                    df_enc[col] = self.encoders[col].transform(df_enc[col])

        return df_enc

    def train(self, df: pd.DataFrame) -> dict:
        """Train the Random Forest model on accident data."""
        if df.empty or len(df) < 5:
            return {'error': 'Not enough data to train (need >= 5 records)'}

        # Add temporal features
        if 'timestamp' in df.columns:
            df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
            df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek

        # Prepare features
        available_cols = [c for c in self.feature_cols if c in df.columns]
        df_clean = df[available_cols + ['severity']].dropna()

        if len(df_clean) < 5:
            return {'error': 'Not enough clean data'}

        df_enc = self._encode_features(df_clean)

        X = df_enc[available_cols].values
        y_enc = LabelEncoder()
        y = y_enc.fit_transform(df_clean['severity'])
        self.encoders['severity'] = y_enc

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

        # Train Random Forest
        self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced')
        self.model.fit(X_train, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test)
        self.metrics = {
            'accuracy': round(float(accuracy_score(y_test, y_pred)), 3),
            'precision': round(float(precision_score(y_test, y_pred, average='weighted', zero_division=0)), 3),
            'recall': round(float(recall_score(y_test, y_pred, average='weighted', zero_division=0)), 3),
            'f1_score': round(float(f1_score(y_test, y_pred, average='weighted', zero_division=0)), 3),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'classes': y_enc.classes_.tolist(),
            'feature_importances': dict(zip(available_cols, [round(float(fi), 3) for fi in self.model.feature_importances_])),
        }

        logger.info(f'Model trained: accuracy={self.metrics["accuracy"]}, f1={self.metrics["f1_score"]}')
        return self.metrics

    def predict(self, input_data: dict, training_df: pd.DataFrame = None) -> dict:
        """Predict severity for given conditions."""
        # Auto-train if no model
        if self.model is None and training_df is not None and not training_df.empty:
            self.train(training_df)

        if self.model is None:
            # Return rule-based prediction as fallback
            return self._rule_based_predict(input_data)

        try:
            df_input = pd.DataFrame([input_data])

            # Add temporal
            if 'hour' not in df_input.columns:
                df_input['hour'] = 12
            if 'day_of_week' not in df_input.columns:
                df_input['day_of_week'] = 3

            available_cols = [c for c in self.feature_cols if c in df_input.columns]
            df_enc = self._encode_features(df_input)

            X = df_enc[available_cols].values
            pred = self.model.predict(X)[0]
            proba = self.model.predict_proba(X)[0]

            severity_label = self.encoders['severity'].inverse_transform([pred])[0]
            probabilities = dict(zip(self.encoders['severity'].classes_, [round(float(p), 3) for p in proba]))

            return {
                'predicted_severity': severity_label,
                'probabilities': probabilities,
                'confidence': round(float(max(proba)), 3),
                'feature_importances': self.metrics.get('feature_importances', {}) if self.metrics else {},
            }
        except Exception as e:
            logger.error(f'Prediction error: {e}')
            return self._rule_based_predict(input_data)

    def _rule_based_predict(self, data: dict) -> dict:
        """Fallback rule-based prediction."""
        score = 0
        if data.get('weather') in ['rain', 'snow', 'fog', 'sleet']:
            score += 1
        if data.get('road_condition') in ['icy', 'wet', 'debris']:
            score += 1
        if data.get('visibility') in ['poor', 'very_poor']:
            score += 1
        if data.get('speed_limit', 0) > 60:
            score += 1

        levels = ['minor', 'moderate', 'severe', 'fatal']
        predicted = levels[min(score, 3)]

        return {
            'predicted_severity': predicted,
            'probabilities': {l: round(1.0 / (1 + abs(i - score)), 2) for i, l in enumerate(levels)},
            'confidence': round(0.5 + score * 0.1, 2),
            'method': 'rule_based_fallback',
        }

    def get_metrics(self) -> dict:
        """Return current model performance metrics."""
        return self.metrics or {'status': 'not_trained', 'message': 'Call /api/model/train first'}
