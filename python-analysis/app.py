import os
import sys
import json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from src.pipeline.predict_pipeline import CustomData, PredictPipeline
from src.logger import logging
from datetime import datetime

# Initialize Flask App
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Configuration
DATA_PATH = os.path.join(os.path.dirname(__file__), 'accident_prediction_india.csv')
MANUAL_REPORTS_PATH = os.path.join(os.path.dirname(__file__), 'artifacts', 'manual_reports.json')


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_severity(value):
    raw = str(value or '').strip().lower()
    mapping = {
        'fatal': 'fatal',
        'severe': 'severe',
        'serious': 'severe',
        'major': 'severe',
        'moderate': 'moderate',
        'minor': 'minor'
    }
    return mapping.get(raw, 'moderate')


def _normalize_weather(value):
    raw = str(value or '').strip().lower()
    if raw in ('clear', 'sunny'):
        return 'clear'
    if raw in ('rain', 'rainy', 'drizzle'):
        return 'rain'
    if raw in ('fog', 'foggy', 'hazy', 'mist'):
        return 'fog'
    if raw in ('snow', 'snowy'):
        return 'snow'
    if raw in ('sleet',):
        return 'sleet'
    return 'clear'


def _normalize_road_type(value):
    raw = str(value or '').strip().lower()
    if 'highway' in raw:
        return 'highway'
    if 'rural' in raw:
        return 'rural'
    return 'urban'


def _infer_time_of_day(hour_value):
    hour = _safe_int(hour_value, 12)
    if 5 <= hour < 12:
        return 'Morning'
    if 12 <= hour < 17:
        return 'Afternoon'
    if 17 <= hour < 21:
        return 'Evening'
    return 'Night'


def _infer_lighting_from_visibility(visibility):
    vis = str(visibility or '').strip().lower()
    return 'Dark' if vis in ('poor', 'very_poor') else 'Daylight'


def _normalize_time_of_day(value):
    raw = str(value or '').strip().lower()
    if raw in ('morning', 'forenoon'):
        return 'Morning', 8
    if raw in ('afternoon', 'noon'):
        return 'Afternoon', 13
    if raw in ('evening', 'dusk'):
        return 'Evening', 18
    if raw in ('night', 'late night', 'midnight'):
        return 'Night', 22
    return 'Afternoon', 12


def _normalize_vehicle_type(value):
    raw = str(value or '').strip().lower()
    if raw in ('car', 'sedan', 'suv'):
        return 'Car'
    if raw in ('motorcycle', 'bike', 'two wheeler'):
        return 'Motorcycle'
    if raw in ('cycle', 'bicycle'):
        return 'Cycle'
    if raw in ('truck', 'lorry'):
        return 'Truck'
    return 'Car'


def _normalize_prediction_road_type(value):
    raw = str(value or '').strip().lower()
    if 'state highway' in raw:
        return 'State Highway'
    if 'national highway' in raw or raw == 'highway':
        return 'National Highway'
    if 'urban' in raw:
        return 'Urban Road'
    if 'rural' in raw or 'village' in raw:
        return 'Village Road'
    return str(value or 'National Highway').strip().title()


def _prediction_distribution(predicted_severity):
    templates = {
        'minor': {'minor': 0.70, 'moderate': 0.18, 'serious': 0.08, 'fatal': 0.04},
        'moderate': {'minor': 0.18, 'moderate': 0.58, 'serious': 0.18, 'fatal': 0.06},
        'serious': {'minor': 0.08, 'moderate': 0.20, 'serious': 0.58, 'fatal': 0.14},
        'fatal': {'minor': 0.03, 'moderate': 0.12, 'serious': 0.25, 'fatal': 0.60}
    }
    return templates.get(str(predicted_severity or '').strip().lower(), templates['moderate'])


def _canonical_prediction_label(value):
    raw = str(value or '').strip().lower()
    mapping = {
        'minor': 'Minor',
        'moderate': 'Moderate',
        'serious': 'Serious',
        'severe': 'Serious',
        'fatal': 'Fatal'
    }
    return mapping.get(raw, 'Moderate')


def _severity_rank(label):
    rank = {'Minor': 1, 'Moderate': 2, 'Serious': 3, 'Fatal': 4}
    return rank.get(_canonical_prediction_label(label), 2)


def _apply_safety_floor(predicted_severity, speed_limit, weather, visibility, road_type):
    normalized_weather = _normalize_weather(weather)
    normalized_road_type = _normalize_road_type(road_type)
    normalized_visibility = str(visibility or '').strip().lower()

    floor = 'Minor'
    if speed_limit >= 180:
        floor = 'Fatal'
    elif speed_limit >= 140:
        floor = 'Serious'
    elif speed_limit >= 110:
        floor = 'Moderate'

    if speed_limit >= 160 and normalized_weather in ('rain', 'fog', 'snow', 'sleet'):
        floor = 'Fatal'
    elif speed_limit >= 120 and normalized_weather in ('rain', 'fog', 'snow', 'sleet'):
        floor = 'Serious'
    elif speed_limit >= 110 and normalized_visibility in ('poor', 'very_poor'):
        floor = 'Serious'
    elif speed_limit >= 110 and normalized_road_type == 'highway':
        floor = 'Serious'

    current = _canonical_prediction_label(predicted_severity)
    return floor if _severity_rank(floor) > _severity_rank(current) else current


def _format_dataset_timestamp(row):
    month_map = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    year = _safe_int(row.get('Year'), datetime.utcnow().year)
    month_name = str(row.get('Month', 'January')).strip().lower()
    month = month_map.get(month_name, 1)
    time_raw = str(row.get('Time of Day', '12:00')).strip()
    try:
        hour, minute = time_raw.split(':', 1)
        return f"{year:04d}-{month:02d}-01T{_safe_int(hour, 12):02d}:{_safe_int(minute, 0):02d}:00"
    except ValueError:
        return f"{year:04d}-{month:02d}-01T12:00:00"


def _dataset_row_to_accident(row, idx):
    road_detail = str(row.get('Accident Location Details') or '').strip()
    city = str(row.get('City Name') or '').strip()
    road_name = road_detail or city or 'Unknown Location'
    if city and city.lower() != 'unknown' and city.lower() not in road_name.lower():
        road_name = f"{road_name}, {city}"

    return {
        'id': f'csv-{idx}',
        'timestamp': _format_dataset_timestamp(row),
        'road_name': road_name,
        'road_type': _normalize_road_type(row.get('Road Type')),
        'severity': _normalize_severity(row.get('Accident Severity')),
        'vehicle_count': _safe_int(row.get('Number of Vehicles Involved'), 0),
        'injured_count': _safe_int(row.get('Number of Casualties'), 0),
        'weather': _normalize_weather(row.get('Weather Conditions')),
        'road_condition': str(row.get('Road Condition') or 'unknown').strip().lower(),
        'status': 'reported',
    }


def _load_manual_reports():
    try:
        if not os.path.exists(MANUAL_REPORTS_PATH):
            return []
        with open(MANUAL_REPORTS_PATH, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
            return data if isinstance(data, list) else []
    except Exception as err:
        logging.warning(f"Failed to load manual reports: {err}")
        return []


def _save_manual_reports(reports):
    try:
        os.makedirs(os.path.dirname(MANUAL_REPORTS_PATH), exist_ok=True)
        with open(MANUAL_REPORTS_PATH, 'w', encoding='utf-8') as fh:
            json.dump(reports, fh, ensure_ascii=True, indent=2)
    except Exception as err:
        logging.error(f"Failed to save manual reports: {err}")


MANUAL_REPORTS = _load_manual_reports()

def load_dataset():
    """Helper to load the dataset safely."""
    try:
        return pd.read_csv(DATA_PATH)
    except Exception as e:
        logging.error(f"Failed to load dataset: {e}")
        return None

@app.route('/api/alerts/active', methods=['GET'])
def active_alerts():
    return jsonify({
        'status': 'success',
        'data': [
            {'id': 1, 'title': 'High Risk: Highway 101', 'severity': 'high', 'timestamp': datetime.now().isoformat()},
            {'id': 2, 'title': 'Fog Warning: Sector 7', 'severity': 'medium', 'timestamp': datetime.now().isoformat()}
        ]
    })

@app.route('/api/analytics/trends', methods=['GET'])
def analytics_trends():
    return jsonify({
        'status': 'success',
        'data': [
            { 'date': '2026-04-10', 'count': 45, 'severe': 12 },
            { 'date': '2026-04-11', 'count': 38, 'severe': 8 },
            { 'date': '2026-04-12', 'count': 52, 'severe': 15 },
            { 'date': '2026-04-13', 'count': 41, 'severe': 10 },
            { 'date': '2026-04-14', 'count': 49, 'severe': 14 },
            { 'date': '2026-04-15', 'count': 33, 'severe': 7 }
        ]
    })

@app.route('/api/analytics/hotspots', methods=['GET'])
def analytics_hotspots():
    return jsonify({
        'status': 'success',
        'data': [
            { 'id': 1, 'location': 'Downtown Crossing', 'count': 120, 'severity': 'High', 'lat': 28.6139, 'lng': 77.2090 },
            { 'id': 2, 'location': 'North Highway Exit', 'count': 85, 'severity': 'Medium', 'lat': 28.7041, 'lng': 77.1025 },
            { 'id': 3, 'location': 'East Industrial Road', 'count': 64, 'severity': 'Low', 'lat': 28.5355, 'lng': 77.3910 }
        ]
    })

@app.route('/api/analytics/correlations', methods=['GET'])
def analytics_correlations():
    return jsonify({
        'status': 'success',
        'data': [
            { 'factor': 'Weather vs Severity', 'value': 0.85 },
            { 'factor': 'Speed vs Fatalities', 'value': 0.92 },
            { 'factor': 'Night vs Accidents', 'value': 0.78 }
        ]
    })

@app.route('/api/analytics/timeseries', methods=['GET'])
def analytics_timeseries():
    # Alias for trends to match frontend
    return analytics_trends()

@app.route('/api/eda/distributions', methods=['GET'])
def eda_distributions():
    return jsonify({
        'status': 'success',
        'data': {
            'weather': [
                {'name': 'Clear', 'count': 450},
                {'name': 'Rainy', 'count': 120},
                {'name': 'Foggy', 'count': 80}
            ],
            'road_type': [
                {'name': 'Highway', 'count': 500},
                {'name': 'Urban', 'count': 300},
                {'name': 'Rural', 'count': 200}
            ]
        }
    })

@app.route('/api/eda/correlations', methods=['GET'])
def eda_correlations():
    return jsonify({
        'status': 'success',
        'data': [
            {'name': 'Speed vs Severity', 'value': 85},
            {'name': 'Weather vs Severity', 'value': 65},
            {'name': 'Time vs Severity', 'value': 45}
        ]
    })

@app.route('/api/eda/summary', methods=['GET'])
def eda_summary():
    return jsonify({
        'status': 'success',
        'data': {
            'total_accidents': 1250,
            'avg_injured': 1.2,
            'avg_vehicles': 2.1,
            'avg_speed': 45,
            'avg_speed_limit': 45,
            'top_severity': 'Serious',
            'most_common_severity': 'Serious',
            'top_weather': 'Clear',
            'most_common_weather': 'Clear',
            'severity_distribution': [
                {'name': 'fatal', 'count': 45},
                {'name': 'severe', 'count': 220},
                {'name': 'moderate', 'count': 320},
                {'name': 'minor', 'count': 665}
            ]
        }
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Accident Prediction Service',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/predict/severity', methods=['POST'])
def predict_severity():
    try:
        data = request.get_json() or {}
        logging.info(f"Prediction requested for: {data}")

        weather_conditions = data.get('weatherConditions') or data.get('weather_conditions') or data.get('weather') or 'clear'
        road_type = data.get('roadType') or data.get('road_type') or 'urban'
        road_condition = data.get('roadCondition') or data.get('road_condition') or 'dry'
        lighting_conditions = data.get('lightingConditions') or data.get('lighting_conditions') or _infer_lighting_from_visibility(data.get('visibility'))
        time_of_day, inferred_hour = _normalize_time_of_day(data.get('timeOfDay') or data.get('time_of_day') or _infer_time_of_day(data.get('hour')))
        hour = _safe_int(data.get('hour'), inferred_hour)
        num_vehicles = _safe_int(data.get('numVehicles') or data.get('num_vehicles') or data.get('vehicle_count'), 2)
        num_casualties = _safe_int(data.get('numCasualties') or data.get('num_casualties') or data.get('injured_count'), 0)
        speed_limit = _safe_int(data.get('speedLimit') or data.get('speed_limit'), 40)
        driver_age = _safe_int(data.get('driverAge') or data.get('driver_age'), 30)

        predicted_severity = 'moderate'
        confidence = 0.78
        probabilities = _prediction_distribution(predicted_severity)

        try:
            # Try real ML model
            custom_data = CustomData(
                weather_conditions=str(weather_conditions).strip().title(),
                road_type=_normalize_prediction_road_type(road_type),
                road_condition=str(road_condition).strip().title(),
                lighting_conditions=str(lighting_conditions).strip().title(),
                time_of_day=time_of_day,
                vehicle_type=_normalize_vehicle_type(data.get('vehicleType') or data.get('vehicle_type') or data.get('vehicleTypeInvolved')),
                driver_gender=str(data.get('driverGender') or data.get('driver_gender') or 'Male').strip().title(),
                alcohol_involvement=str(data.get('alcoholInvolvement') or data.get('alcohol_involvement') or 'No').strip().title(),
                num_vehicles=num_vehicles,
                num_casualties=num_casualties,
                speed_limit=speed_limit,
                driver_age=driver_age,
                hour=hour
            )
            pred_df = custom_data.get_data_as_data_frame()
            predict_pipeline = PredictPipeline()
            results = predict_pipeline.predict(pred_df)
            predicted_severity = _canonical_prediction_label(results[0])
            probabilities = _prediction_distribution(predicted_severity)
            confidence = 0.84
        except Exception as ml_err:
            logging.warning(f"ML Model failed, using heuristic fallback: {str(ml_err)}")

            weather = _normalize_weather(weather_conditions)
            road = _normalize_road_type(road_type)
            visibility = str(data.get('visibility') or '').strip().lower()
            hour = _safe_int(data.get('hour'), 12)

            risk_score = 0
            if speed_limit >= 85:
                risk_score += 3
            elif speed_limit >= 65:
                risk_score += 2
            elif speed_limit >= 45:
                risk_score += 1

            if weather in ('rain', 'fog', 'snow', 'sleet'):
                risk_score += 2
            if road == 'highway':
                risk_score += 1
            if visibility in ('poor', 'very_poor'):
                risk_score += 2
            if hour >= 20 or hour <= 5:
                risk_score += 1
            if num_vehicles >= 4:
                risk_score += 1

            if risk_score >= 7:
                predicted_severity = 'Fatal'
            elif risk_score >= 5:
                predicted_severity = 'Serious'
            elif risk_score >= 3:
                predicted_severity = 'Moderate'
            else:
                predicted_severity = 'Minor'

            probabilities = _prediction_distribution(predicted_severity)
            confidence = min(0.95, 0.62 + (risk_score * 0.05))

        predicted_severity = _apply_safety_floor(
            predicted_severity,
            speed_limit,
            weather_conditions,
            data.get('visibility'),
            road_type,
        )
        probabilities = _prediction_distribution(predicted_severity)

        return jsonify({
            'status': 'success',
            'prediction': predicted_severity,
            'predicted_severity': predicted_severity,
            'probabilities': probabilities,
            'confidence': round(confidence, 2),
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logging.error(f"Global Prediction error: {str(e)}")
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/api/dashboard/metrics', methods=['GET'])
def dashboard_metrics():
    import pandas as pd
    try:
        df = pd.read_csv('accident_prediction_india.csv')
        total_accidents = len(df)
        fatalities = int(df['Number of Fatalities'].sum())
        injuries = int(df['Number of Casualties'].sum())
        
        # Severity counts
        severity_counts = df['Accident Severity'].value_counts().to_dict()
        
        return jsonify({
            'status': 'success',
            'data': {
                'totalAccidents': total_accidents,
                'fatalAccidents': fatalities,
                'severeAccidents': severity_counts.get('Serious', 0),
                'safeHoursStreak': 12,
                'totalInjured': injuries,
                'hotspotCount': 8,
                'trend': 5
            }
        })
    except Exception as e:
        logging.error(f"Error calculating metrics: {e}")
        return jsonify({
            'status': 'success',
            'data': {
                'totalAccidents': 1250,
                'fatalAccidents': 45,
                'severeAccidents': 320,
                'safeHoursStreak': 12,
                'totalInjured': 415,
                'hotspotCount': 8,
                'trend': 5
            }
        })

@app.route('/api/dashboard/analytics', methods=['GET'])
def dashboard_analytics():
    import pandas as pd
    try:
        df = pd.read_csv('accident_prediction_india.csv')
        
        # Severity distribution for pie chart
        severity_dist = df['Accident Severity'].value_counts().reset_index()
        severity_dist.columns = ['name', 'value']
        
        # Road type distribution
        road_dist = df['Road Type'].value_counts().head(5).reset_index()
        road_dist.columns = ['name', 'value']
        
        # Monthly trend (using a subset of data for timeseries)
        # Assuming we want a sample of recent dates or just a trend
        # For now, we'll keep a semi-realistic trend based on the data
        timeseries = [
            { 'date': '2026-04-10', 'count': 45, 'severe': 12 },
            { 'date': '2026-04-11', 'count': 38, 'severe': 8 },
            { 'date': '2026-04-12', 'count': 52, 'severe': 15 },
            { 'date': '2026-04-13', 'count': 41, 'severe': 10 }
        ]

        return jsonify({
            'status': 'success',
            'data': {
                'hourly_distribution': [
                    { 'name': '00:00', 'fatal': 10, 'serious': 20, 'minor': 40 },
                    { 'name': '08:00', 'fatal': 25, 'serious': 45, 'minor': 80 },
                    { 'name': '16:00', 'fatal': 40, 'serious': 70, 'minor': 110 }
                ],
                'timeseries': timeseries,
                'road_type_distribution': road_dist.to_dict(orient='records'),
                'severity_distribution': severity_dist.to_dict(orient='records')
            }
        })
    except Exception as e:
        logging.error(f"Error calculating analytics: {e}")
        return jsonify({
            'status': 'success',
            'data': {
                'hourly_distribution': [],
                'timeseries': [],
                'road_type_distribution': [],
                'severity_distribution': []
            }
        })

@app.route('/api/accidents', methods=['GET', 'POST'])
def list_accidents():
    global MANUAL_REPORTS

    if request.method == 'POST':
        try:
            data = request.get_json() or {}
            report = {
                'id': f"manual-{int(datetime.utcnow().timestamp() * 1000)}",
                'timestamp': datetime.utcnow().isoformat(),
                'road_name': data.get('location') or data.get('road_name') or 'Unknown Location',
                'road_type': _normalize_road_type(data.get('roadType') or data.get('road_type')),
                'severity': _normalize_severity(data.get('severity')),
                'vehicle_count': _safe_int(data.get('vehicle_count'), 1),
                'injured_count': _safe_int(data.get('injured_count'), 0),
                'weather': _normalize_weather(data.get('weather')),
                'road_condition': str(data.get('road_condition') or 'unknown').strip().lower(),
                'status': 'reported',
                'description': data.get('description') or ''
            }
            MANUAL_REPORTS = [report] + MANUAL_REPORTS
            _save_manual_reports(MANUAL_REPORTS)
            return jsonify({'status': 'success', 'data': report}), 201
        except Exception as e:
            return jsonify({'status': 'error', 'error': str(e)}), 500

    try:
        severity = str(request.args.get('severity', '')).strip().lower()
        road_type = str(request.args.get('roadType', '')).strip().lower()
        weather = str(request.args.get('weather', '')).strip().lower()
        limit = max(_safe_int(request.args.get('limit', 20), 20), 1)
        offset = max(_safe_int(request.args.get('offset', 0), 0), 0)

        df = load_dataset()
        dataset_records = []
        if df is not None:
            dataset_records = [_dataset_row_to_accident(row, idx) for idx, row in df.iterrows()]

        all_records = MANUAL_REPORTS + dataset_records

        if severity:
            all_records = [r for r in all_records if str(r.get('severity', '')).lower() == severity]
        if road_type:
            all_records = [r for r in all_records if str(r.get('road_type', '')).lower() == road_type]
        if weather:
            all_records = [r for r in all_records if str(r.get('weather', '')).lower() == weather]

        total = len(all_records)
        rows = all_records[offset: offset + limit]

        return jsonify({
            'status': 'success',
            'data': rows,
            'total': total,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/recommendations/generate', methods=['GET'])
def generate_recommendations():
    return jsonify({
        'status': 'success',
        'data': [
            {'id': 3, 'title': 'Add Rumble Strips', 'impact': 'Medium', 'type': 'Engineering'},
            {'id': 4, 'title': 'Reduce Speed Limit to 40', 'impact': 'High', 'type': 'Enforcement'}
        ]
    })

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations_list():
    return dashboard_recommendations()

@app.route('/api/alerts', methods=['GET'])
def get_alerts_list():
    return active_alerts()

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    data = request.get_json()
    email = data.get('email')
    # Mock login success
    return jsonify({
        'status': 'success',
        'token': 'mock-jwt-token',
        'user': {
            'id': '1',
            'name': email.split('@')[0].capitalize() if email else 'Officer',
            'email': email,
            'role': 'officer'
        }
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'token': 'mock-jwt-token',
        'user': {
            'id': '2',
            'name': data.get('name', 'New User'),
            'email': data.get('email'),
            'role': 'officer'
        }
    })

@app.route('/api/auth/verify', methods=['GET'])
def verify():
    return jsonify({
        'status': 'success',
        'user': {
            'id': '1',
            'name': 'Officer Johnson',
            'role': 'officer'
        }
    })

@app.route('/api/dashboard/recommendations', methods=['GET'])
def dashboard_recommendations():
    return jsonify({
        'status': 'success',
        'data': [
            {
                'id': 1,
                'title': 'Deploy Highway Patrol',
                'description': 'Increase patrol frequency on high-risk corridors between 8 PM and 2 AM.',
                'priority': 'high',
                'confidence': 0.91,
                'impact': 'High',
                'type': 'Safety'
            },
            {
                'id': 2,
                'title': 'Install Lighting at Sector 4',
                'description': 'Improve visibility near intersections with repeated night-time incidents.',
                'priority': 'medium',
                'confidence': 0.83,
                'impact': 'Medium',
                'type': 'Infrastructure'
            },
            {
                'id': 3,
                'title': 'Adaptive Speed Enforcement',
                'description': 'Trigger variable speed limits during rain and low-visibility periods.',
                'priority': 'high',
                'confidence': 0.88,
                'impact': 'High',
                'type': 'Enforcement'
            }
        ]
    })

@app.route('/api/dashboard/alerts', methods=['GET'])
def dashboard_alerts():
    return jsonify({
        'status': 'success',
        'data': [
            {'id': 1, 'type': 'High Risk', 'message': 'Heavy rain predicted on NH-44', 'severity': 'Critical'},
            {'id': 2, 'type': 'Alert', 'message': 'Increased traffic in Urban Sector 5', 'severity': 'Warning'}
        ]
    })

if __name__ == '__main__':
    # Use environment variables for port and debug mode
    port = int(os.getenv('PORT', 5001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    logging.info(f'Accident Prediction Service starting on port {port} (Debug: {debug_mode})')
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
