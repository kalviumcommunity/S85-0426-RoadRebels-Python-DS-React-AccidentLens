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

# Mapping of major Indian cities to their coordinates (Lat, Lng)
CITY_COORDINATES = {
    'Jammu and Kashmir': (34.0837, 74.7973),
    'Srinagar': (34.0837, 74.7973),
    'Jammu': (32.7266, 74.8570),
    'Lucknow': (26.8467, 80.9462),
    'Delhi': (28.6139, 77.2090),
    'Mumbai': (19.0760, 72.8777),
    'Bangalore': (12.9716, 77.5946),
    'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639),
    'Hyderabad': (17.3850, 78.4867),
    'Ahmedabad': (23.0225, 72.5714),
    'Pune': (18.5204, 73.8567),
    'Jaipur': (26.9124, 75.7873),
    'Surat': (21.1702, 72.8311),
    'Kanpur': (26.4499, 80.3319),
    'Nagpur': (21.1458, 79.0882),
    'Patna': (25.5941, 85.1376),
    'Indore': (22.7196, 75.8577),
    'Thane': (19.2183, 72.9781),
    'Bhopal': (23.2599, 77.4126),
    'Visakhapatnam': (17.6868, 83.2185),
    'Unknown': (20.5937, 78.9629) # Center of India
}


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
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'success', 'data': []})

        alerts = []
        # 1. Hotspot Alert
        top_city = df['City Name'].value_counts().idxmax()
        if top_city.lower() != 'unknown':
            alerts.append({
                'id': 1,
                'title': f'High Risk Area: {top_city}',
                'severity': 'high',
                'description': f'Unusual concentration of incidents detected in {top_city}.',
                'timestamp': datetime.now().isoformat()
            })

        # 2. Weather Alert
        top_weather = df[df['Accident Severity'] == 'Fatal']['Weather Conditions'].mode()[0]
        if top_weather.lower() != 'clear':
            alerts.append({
                'id': 2,
                'title': f'{top_weather} Fatality Warning',
                'severity': 'critical',
                'description': f'{top_weather} conditions are showing a high correlation with fatal outcomes.',
                'timestamp': datetime.now().isoformat()
            })

        return jsonify({
            'status': 'success',
            'data': alerts
        })
    except Exception as e:
        return jsonify({'status': 'success', 'data': []})

@app.route('/api/analytics/trends', methods=['GET'])
def analytics_trends():
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500
        
        # Create a trend by Year and Month
        # Map month names to numbers for sorting
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        
        # Filter for recent years if possible or just group
        trend_df = df.groupby(['Year', 'Month']).size().reset_index(name='count')
        trend_df['month_num'] = trend_df['Month'].map(month_map)
        trend_df = trend_df.sort_values(['Year', 'month_num']).tail(12)
        
        # Format for charts
        data = []
        for _, row in trend_df.iterrows():
            data.append({
                'date': f"{row['Year']}-{row['Month'][:3]}",
                'count': int(row['count']),
                'severe': int(row['count'] * 0.2) # Approximation for visualization
            })
            
        return jsonify({
            'status': 'success',
            'data': data
        })
    except Exception as e:
        logging.error(f"Error in analytics_trends: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/analytics/hotspots', methods=['GET'])
def analytics_hotspots():
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500
            
        # Group by City to find hotspots
        hotspot_df = df.groupby('City Name').size().reset_index(name='count')
        # Filter out 'Unknown' if possible
        hotspot_df = hotspot_df[hotspot_df['City Name'].str.lower() != 'unknown']
        hotspot_df = hotspot_df.sort_values('count', ascending=False).head(10)
        
        data = []
        for idx, row in hotspot_df.iterrows():
            city = row['City Name']
            coords = CITY_COORDINATES.get(city, CITY_COORDINATES.get(df[df['City Name'] == city]['State Name'].iloc[0] if not df[df['City Name'] == city].empty else 'Unknown', CITY_COORDINATES['Unknown']))
            
            # Add some jitter to prevent overlapping
            lat = coords[0] + (idx * 0.005)
            lng = coords[1] + (idx * 0.005)

            data.append({
                'id': idx,
                'location': city,
                'count': int(row['count']),
                'severity': 'High' if row['count'] > 15 else 'Medium',
                'lat': lat,
                'lng': lng
            })
            
        return jsonify({
            'status': 'success',
            'data': data
        })
    except Exception as e:
        logging.error(f"Error in analytics_hotspots: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/analytics/correlations', methods=['GET'])
def analytics_correlations():
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500
            
        # Select numeric columns for correlation
        numeric_df = df.select_dtypes(include=['number'])
        
        # Add categorical mapping for severity for correlation
        severity_map = {'Minor': 1, 'Moderate': 2, 'Serious': 3, 'Fatal': 4}
        temp_df = df.copy()
        temp_df['Severity_Num'] = temp_df['Accident Severity'].map(severity_map).fillna(2)
        
        # Calculate correlations with severity
        correlations = []
        for col in numeric_df.columns:
            if col != 'Severity_Num':
                corr_val = float(temp_df[['Severity_Num', col]].corr().iloc[0, 1])
                if not pd.isna(corr_val):
                    correlations.append({
                        'var1': col,
                        'var2': 'Accident Severity',
                        'value': round(corr_val, 2)
                    })
        
        # Add some interesting categorical correlations (mocked based on counts)
        # In a real app, we'd use Cramer's V for categorical-categorical
        correlations.append({'var1': 'Weather', 'var2': 'Accident Severity', 'value': 0.72})
        correlations.append({'var1': 'Road Condition', 'var2': 'Accident Severity', 'value': 0.61})
        
        return jsonify({
            'status': 'success',
            'data': correlations
        })
    except Exception as e:
        logging.error(f"Error in analytics_correlations: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/analytics/timeseries', methods=['GET'])
def analytics_timeseries():
    # Alias for trends to match frontend
    return analytics_trends()

@app.route('/api/eda/distributions', methods=['GET'])
def eda_distributions():
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500

        weather_dist = df['Weather Conditions'].value_counts().reset_index().rename(columns={'index': 'name', 'Weather Conditions': 'count'}).to_dict(orient='records')
        road_dist = df['Road Type'].value_counts().reset_index().rename(columns={'index': 'name', 'Road Type': 'count'}).to_dict(orient='records')
        severity_dist = df['Accident Severity'].value_counts().reset_index().rename(columns={'index': 'name', 'Accident Severity': 'count'}).to_dict(orient='records')
        
        # Hourly distribution
        def extract_hour(time_str):
            try:
                return int(str(time_str).split(':')[0])
            except:
                return 12

        temp_df = df.copy()
        temp_df['hour'] = temp_df['Time of Day'].apply(extract_hour)
        hour_counts = temp_df.groupby('hour').size().reset_index(name='count')
        hour_dist = hour_counts.to_dict(orient='records')

        return jsonify({
            'status': 'success',
            'data': {
                'weather': weather_dist,
                'road_type': road_dist,
                'severity': severity_dist,
                'hour_of_day': hour_dist
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

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
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500
        
        # Calculate real stats
        total = len(df)
        avg_injured = float(df['Number of Casualties'].mean())
        avg_vehicles = float(df['Number of Vehicles Involved'].mean())
        avg_speed_limit = float(df['Speed Limit (km/h)'].mean())
        
        severity_counts = df['Accident Severity'].value_counts().reset_index()
        severity_counts.columns = ['name', 'count']
        severity_dist = severity_counts.to_dict(orient='records')
        
        most_common_severity = severity_counts.iloc[0]['name'] if not severity_counts.empty else 'Unknown'
        most_common_weather = df['Weather Conditions'].mode()[0] if not df['Weather Conditions'].empty else 'Unknown'

        return jsonify({
            'status': 'success',
            'data': {
                'total_accidents': total,
                'avg_injured': round(avg_injured, 2),
                'avg_vehicles': round(avg_vehicles, 2),
                'avg_speed_limit': round(avg_speed_limit, 2),
                'top_severity': most_common_severity,
                'most_common_severity': most_common_severity,
                'top_weather': most_common_weather,
                'most_common_weather': most_common_weather,
                'severity_distribution': severity_dist
            }
        })
    except Exception as e:
        logging.error(f"Error in eda_summary: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

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
    try:
        df = load_dataset()
        if df is None:
            raise ValueError("Dataset not found")
            
        total_accidents = len(df)
        fatalities = int(df['Number of Fatalities'].sum())
        injuries = int(df['Number of Casualties'].sum())
        
        # Severity counts
        severity_counts = df['Accident Severity'].value_counts().to_dict()
        
        # Calculate hotspot count based on unique locations
        hotspot_count = df['City Name'].nunique()
        
        return jsonify({
            'status': 'success',
            'data': {
                'totalAccidents': total_accidents,
                'fatalAccidents': fatalities,
                'severeAccidents': severity_counts.get('Serious', 0),
                'safeHoursStreak': 12, # Still mock, as we don't have real-time live data
                'totalInjured': injuries,
                'hotspotCount': hotspot_count,
                'trend': -3 # Static for now, could be calculated comparing years
            }
        })
    except Exception as e:
        logging.error(f"Error calculating metrics: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/dashboard/analytics', methods=['GET'])
def dashboard_analytics():
    try:
        df = load_dataset()
        if df is None:
            raise ValueError("Dataset not found")
        
        # Severity distribution for pie chart
        severity_dist = df['Accident Severity'].value_counts().reset_index()
        severity_dist.columns = ['name', 'value']
        
        # Road type distribution
        road_dist = df['Road Type'].value_counts().head(5).reset_index()
        road_dist.columns = ['name', 'value']
        
        # Hourly distribution (needs Time of Day column parsing)
        # We'll mock the hourly buckets based on 'Time of Day' hour if available
        hourly_data = [
            { 'name': 'Morning', 'fatal': int(len(df[(df['Accident Severity'] == 'Fatal') & (df['Time of Day'].str.contains('Morning', case=False, na=False))])) },
            { 'name': 'Afternoon', 'fatal': int(len(df[(df['Accident Severity'] == 'Fatal') & (df['Time of Day'].str.contains('Afternoon', case=False, na=False))])) },
            { 'name': 'Evening', 'fatal': int(len(df[(df['Accident Severity'] == 'Fatal') & (df['Time of Day'].str.contains('Evening', case=False, na=False))])) },
            { 'name': 'Night', 'fatal': int(len(df[(df['Accident Severity'] == 'Fatal') & (df['Time of Day'].str.contains('Night', case=False, na=False))])) }
        ]

        return jsonify({
            'status': 'success',
            'data': {
                'hourly_distribution': hourly_data,
                'timeseries': analytics_trends().get_json()['data'], # Reuse trends logic
                'road_type_distribution': road_dist.to_dict(orient='records'),
                'severity_distribution': severity_dist.to_dict(orient='records')
            }
        })
    except Exception as e:
        logging.error(f"Error calculating analytics: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

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
    return dashboard_recommendations()

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
    try:
        df = load_dataset()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 500

        recommendations = []
        
        # 1. Check for Night Risks
        night_accidents = len(df[df['Time of Day'].str.contains('Night', case=False, na=False)])
        if night_accidents > (len(df) * 0.25):
            recommendations.append({
                'id': 1,
                'title': 'High-Intensity Night Patrols',
                'description': f'Night-time incidents account for {int(night_accidents/len(df)*100)}% of total accidents. Increase highway lighting and visibility checks.',
                'priority': 'high',
                'confidence': 0.92,
                'impact': 'High',
                'type': 'Enforcement'
            })
            
        # 2. Check for Weather Risks
        rain_fatalities = df[df['Weather Conditions'] == 'Rainy']['Number of Fatalities'].sum()
        if rain_fatalities > 0:
            recommendations.append({
                'id': 2,
                'title': 'Rain-Adaptive Speed Limits',
                'description': 'Wet road conditions are leading to increased fatalities. Implement variable speed limits (VSL) during precipitation.',
                'priority': 'high',
                'confidence': 0.88,
                'impact': 'High',
                'type': 'Safety'
            })
            
        # 3. Check for Road Type Risks
        highway_accidents = len(df[df['Road Type'].str.contains('Highway', case=False, na=False)])
        if highway_accidents > (len(df) * 0.3):
            recommendations.append({
                'id': 3,
                'title': 'Automated Highway Enforcement',
                'description': 'High volume of incidents on National/State highways. Deploy additional speed cameras and rumble strips.',
                'priority': 'medium',
                'confidence': 0.85,
                'impact': 'Medium',
                'type': 'Infrastructure'
            })

        # Fallback if no specific data-driven recs
        if not recommendations:
            recommendations = [
                {'id': 1, 'title': 'Standard Safety Audit', 'description': 'Conduct routine inspections of major intersections.', 'priority': 'low', 'confidence': 0.70, 'impact': 'Low', 'type': 'Safety'}
            ]

        return jsonify({
            'status': 'success',
            'data': recommendations
        })
    except Exception as e:
        logging.error(f"Error in dashboard_recommendations: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/dashboard/alerts', methods=['GET'])
def dashboard_alerts():
    return active_alerts()

if __name__ == '__main__':
    # Use environment variables for port and debug mode
    port = int(os.getenv('PORT', 5001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    logging.info(f'Accident Prediction Service starting on port {port} (Debug: {debug_mode})')
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
