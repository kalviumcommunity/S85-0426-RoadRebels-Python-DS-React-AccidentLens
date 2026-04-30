# AccidentLens: Real-Time Traffic Safety Intelligence

AccidentLens is a production-grade traffic accident prediction platform that leverages machine learning to help authorities reduce incidents through targeted interventions.

## Key Features

- **Real-Time Prediction**: Predict accident severity based on road type, weather, and time of day.
- **Interactive Analytics**: GSAP-powered dashboard with live safety metrics and risk distribution.
- **Automated Weather Integration**: Auto-populates environmental data using real-time weather APIs.
- **Modular ML Pipeline**: Industry-standard Python pipeline for data ingestion, transformation, and training.

## Project Structure

```text
.
├── frontend/             # React (Vite) + Ant Design + Recharts + GSAP
├── python-analysis/      # Flask ML API + Pipeline + Serialized Models
│   ├── notebook/         # Jupyter Notebooks for EDA and Training
│   ├── src/              # Modular ML source code (Ingestion, Transformation)
│   ├── artifacts/        # Serialized .pkl files
│   └── app.py            # Consolidated backend API
└── docker-compose.yml    # Orchestration for the full stack
```

## Getting Started


### 1. Prerequisites
- Python 3.8+
- Node.js 18+
- Docker & Docker Compose (optional)

### 2. Setup ML Backend
```bash
cd python-analysis
pip install -r requirements.txt
python app.py
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## High-Fidelity Data Science

Our prediction engine is backed by extensive research and deep analysis, documented in the `python-analysis/notebook/` directory:
- **`1. EDA ACCIDENT DATA.ipynb`**: A deep dive into the Indian accident landscape using Matplotlib and Seaborn. Includes bivariate correlation analysis, temporal heatmaps, and severity distribution studies.
- **`2. MODEL TRAINING.ipynb`**: Comprehensive documentation of the ML lifecycle. Covers advanced feature engineering, pipeline optimization via GridSearchCV, and performance benchmarking (Precision-Recall, Confusion Matrices).

## Project Insights

* **Weather Impact:** Adverse weather conditions, such as rain and fog, show a strong correlation with fatal and severe accident outcomes compared to clear weather.
* **Speed vs. Severity:** Higher speed limits predictably increase the severity of incidents, escalating outcomes from moderate to serious or fatal.
* **Temporal Patterns:** Specific time periods (such as late night and early morning) tend to have a disproportionately higher concentration of severe incidents, often linking to decreased visibility and driver fatigue.

## Assumptions

* **Data Consistency:** We assumed the historical accident records provided in the dataset are accurate and free from systematic under-reporting, allowing the model to learn authentic patterns.
* **Feature Engineering:** When grouping sparse categories (e.g., classifying various types of two-wheelers simply as 'Motorcycle'), we assumed the behavioral risk profile remains similar enough not to dilute the model's accuracy.
* **Missing Value Handling:** We assumed that missing visibility or lighting data could be reasonably inferred from the time of day, ensuring the model had complete rows for training without dropping valuable data points.

## Limitations

* **Geographical Bias:** The dataset is heavily concentrated on major Indian cities and highways. The model's predictive reliability may drop when applied to highly rural or undocumented village roads.
* **Data Completeness:** Certain fields like driver age or precise road conditions contained missing values that were imputed using statistical averages, which might not perfectly reflect the reality of every individual incident.
* **Real-Time Anomalies:** The prediction approach is rooted in historical trends and scheduled forecasts. Sudden, unrecorded anomalies—like an unexpected oil spill or instant severe flash flood—cannot be factored into the prediction until the data reflects it.

## License

MIT
