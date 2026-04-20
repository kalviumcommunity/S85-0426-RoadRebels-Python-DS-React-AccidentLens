import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_health():
    print("Testing Health Check...")
    try:
        response = requests.get(f"http://localhost:5000/health")
        print(f"Status: {response.status_code}, Response: {response.json()}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

def test_prediction():
    print("\nTesting Real-time Prediction...")
    payload = {
        "weatherConditions": "Rainy",
        "roadType": "National Highway",
        "lightingConditions": "Dark",
        "timeOfDay": "22:00",
        "numVehicles": 2,
        "speedLimit": 80,
        "driverAge": 25
    }
    try:
        response = requests.post(f"{BASE_URL}/predict/severity", json=payload)
        print(f"Status: {response.status_code}, Result: {response.json()}")
    except Exception as e:
        print(f"Prediction Failed: {e}")

def test_metrics():
    print("\nTesting Dashboard Metrics...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/metrics")
        print(f"Status: {response.status_code}, Data: {response.json()}")
    except Exception as e:
        print(f"Metrics Failed: {e}")

def test_accidents():
    print("\nTesting Accident List...")
    try:
        response = requests.get(f"{BASE_URL}/accidents")
        print(f"Status: {response.status_code}, Sample Count: {len(response.json().get('data', []))}")
    except Exception as e:
        print(f"Accident List Failed: {e}")

if __name__ == "__main__":
    print("Starting AccidentLens API Integration Tests...")

    test_health()
    test_prediction()
    test_metrics()
    test_accidents()
    print("\nVerification Complete.")

