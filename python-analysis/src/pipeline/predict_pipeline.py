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
        driver_age: int):

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

    def get_data_as_data_frame(self):
        try:
            custom_data_input_dict = {
                "Weather Conditions": [self.weather_conditions],
                "Road Type": [self.road_type],
                "Road Condition": [self.road_condition],
                "Lighting Conditions": [self.lighting_conditions],
                "Time of Day": [self.time_of_day],
                "Vehicle Type Involved": [self.vehicle_type],
                "Driver Gender": [self.driver_gender],
                "Alcohol Involvement": [self.alcohol_involvement],
                "Number of Vehicles Involved": [self.num_vehicles],
                "Number of Casualties": [self.num_casualties],
                "Speed Limit (km/h)": [self.speed_limit],
                "Driver Age": [self.driver_age]
            }

            return pd.DataFrame(custom_data_input_dict)

        except Exception as e:
            raise CustomException(e, sys)
