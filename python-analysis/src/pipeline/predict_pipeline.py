import sys
import os
import pandas as pd
from src.exception import CustomException
from src.utils import load_object
from src.logger import logging



class PredictPipeline:
    def __init__(self):
        pass

    def predict(self,features):
        try:
            model_path=os.path.join("artifacts","model.pkl")
            preprocessor_path=os.path.join('artifacts','preprocessor.pkl')
            label_encoder_path=os.path.join('artifacts','label_encoder.pkl')
            
            logging.info("Before Loading")
            model=load_object(file_path=model_path)
            preprocessor=load_object(file_path=preprocessor_path)
            label_encoder=load_object(file_path=label_encoder_path)
            
            logging.info("After Loading")
            data_scaled=preprocessor.transform(features)
            preds=model.predict(data_scaled)
            
            # Decode the prediction
            decoded_preds = label_encoder.inverse_transform(preds)
            
            return decoded_preds

        except Exception as e:
            raise CustomException(e,sys)



class CustomData:
    def __init__(self,
        weather_conditions: str,
        road_type: str,
        road_condition: str,
        lighting_conditions: str,
        time_of_day: str,
        vehicle_type: str,
        driver_gender: str,
        alcohol_involvement: str,
        num_vehicles: int,
        num_casualties: int,
        speed_limit: int,
        driver_age: int,
        hour: int | None = None):

        self.weather_conditions = weather_conditions
        self.road_type = road_type
        self.road_condition = road_condition
        self.lighting_conditions = lighting_conditions
        self.time_of_day = time_of_day
        self.vehicle_type = vehicle_type
        self.driver_gender = driver_gender
        self.alcohol_involvement = alcohol_involvement
        self.num_vehicles = num_vehicles
        self.num_casualties = num_casualties
        self.speed_limit = speed_limit
        self.driver_age = driver_age
        self.hour = hour

    def _resolve_hour(self):
        if self.hour is not None:
            try:
                return int(self.hour)
            except (TypeError, ValueError):
                pass

        time_bucket = str(self.time_of_day or '').strip().lower()
        mapping = {
            'morning': 8,
            'afternoon': 13,
            'evening': 18,
            'night': 22,
        }
        return mapping.get(time_bucket, 12)

    def get_data_as_data_frame(self):
        try:
            custom_data_input_dict = {
                "Weather_Conditions": [self.weather_conditions],
                "Road_Type": [self.road_type],
                "Lighting_Conditions": [self.lighting_conditions],
                "Vehicle_Type_Involved": [self.vehicle_type],
                "Driver_Gender": [self.driver_gender],
                "Alcohol_Involvement": [self.alcohol_involvement],
                "Number_of_Vehicles_Involved": [self.num_vehicles],
                "Number_of_Casualties": [self.num_casualties],
                "Driver_Age": [self.driver_age],
                "Speed_Limit_(km/h)": [self.speed_limit],
                "Hour": [self._resolve_hour()]
            }

            return pd.DataFrame(custom_data_input_dict)

        except Exception as e:
            raise CustomException(e, sys)
