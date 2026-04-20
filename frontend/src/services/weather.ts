import axios from 'axios';

// Using a free public API for demo purposes
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  condition: string;
}

export const fetchCurrentWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
      }
    });

    const current = response.data.current_weather;
    
    // Map WMO Weather interpretation codes (0-99)
    // https://open-meteo.com/en/docs
    const mapCondition = (code: number): string => {
      if (code === 0) return 'Clear';
      if (code <= 3) return 'Cloudy';
      if (code <= 48) return 'Foggy';
      if (code <= 67) return 'Rainy';
      if (code <= 77) return 'Snowy';
      if (code <= 82) return 'Rainy';
      return 'Stormy';
    };

    return {
      temperature: current.temperature,
      weatherCode: current.weathercode,
      condition: mapCondition(current.weathercode)
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return {
      temperature: 25,
      weatherCode: 0,
      condition: 'Clear'
    };
  }
};
