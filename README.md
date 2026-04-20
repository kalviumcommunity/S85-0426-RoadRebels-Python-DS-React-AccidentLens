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

## License

MIT
