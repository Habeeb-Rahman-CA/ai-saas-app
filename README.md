# Predictr AI — Automated CSV Predictions SaaS

> **Upload CSV → Automated ML Preprocessing & Training → High-Precision Predictions**

Predictr AI is a modern SaaS platform designed to transform raw tabular CSV data into trained machine learning models and instant batch predictions with zero machine learning boilerplate required.

---

## ✨ Features

- **📊 1. Data Studio & Smart Profiler**
  - Drag-and-drop tabular CSV upload.
  - Automatic column type inference (Numeric, Categorical, Boolean, Datetime).
  - Missing value detection & percentage rates.
  - Smart Target Column recommendations (Classification vs. Regression).
  - 10-row instant interactive preview table.
  - Built-in 1-Click Demo Datasets (*Customer Churn* and *Real Estate Valuation*).

- **🤖 2. Automated Machine Learning (AutoML) Engine**
  - Automated feature imputation (median for numeric, most-frequent for categorical).
  - Feature scaling (`StandardScaler`) and encoding (`OneHotEncoder`).
  - Benchmarks multiple baseline algorithms:
    - **Classification:** Random Forest, Gradient Boosting, Logistic Regression.
    - **Regression:** Random Forest Regressor, Gradient Boosting Regressor, Ridge Regression.
  - Evaluates models with full metrics (Accuracy, F1-Score, Precision, Recall, Confusion Matrix, R², MAE, RMSE).
  - Automatic Winner Selection & persistence via `joblib`.
  - Feature Importance extraction and ranking visualization.

- **🚀 3. Batch CSV Predictions**
  - Upload unlabelled CSV files.
  - Generates predictions across all rows with confidence scores and probabilities.
  - Missing input features automatically imputed based on training schema.
  - Searchable, interactive preview table.
  - 1-Click export to download enriched predictions as CSV.

- **⚡ 4. Interactive "What-If" Simulator**
  - Real-time parameter tweaking with sliders and inputs.
  - Instant inference calculation with class probability distribution.

- **📜 5. Inference History & Archive**
  - Keeps persistent SQLite records of all datasets, models, and prediction jobs.
  - Direct re-download links for previous batches.

---

## 🛠️ Tech Stack

- **Backend:** Python 3, FastAPI, Scikit-Learn, Pandas, NumPy, Joblib, SQLite
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ (with virtual environment created)
- Node.js 18+ & npm

### 2. Start the App

#### Option A: Single Command Production Mode (Recommended)
This starts FastAPI on `http://localhost:8000`, serving both the API and the React frontend:
```bash
./run.sh
```
Open your browser to: **[http://localhost:8000](http://localhost:8000)**

#### Option B: Development Mode (Hot Reloading)
```bash
./run.sh dev
```
- FastAPI API runs on: `http://localhost:8000`
- Vite React frontend runs on: `http://localhost:5173`

---

## 📁 Project Structure

```text
ai-saas-app/
├── backend/
│   ├── main.py            # FastAPI REST endpoints & static file mount
│   ├── ml_engine.py       # Scikit-Learn AutoML, evaluation, & inference engine
│   ├── storage.py         # SQLite metadata persistence
│   └── sample_data.py     # Demo datasets generator
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # SaaS Header & Tab Navigation
│   │   │   ├── DatasetUpload.tsx      # CSV upload, profiling, & samples
│   │   │   ├── ModelTrainer.tsx       # AutoML config, metrics, & benchmarks
│   │   │   ├── BatchPredictor.tsx     # Batch CSV predictions & export
│   │   │   ├── SinglePredictor.tsx    # Interactive "What-If" simulator
│   │   │   └── PredictionsHistory.tsx # Past prediction archive
│   │   ├── App.tsx                    # Main state management
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── index.css                  # Tailwind styles
│   ├── package.json
│   └── vite.config.ts
├── data/                  # Auto-created storage (datasets, models, predictions)
├── run.sh                 # Unified runner script
├── requirements.txt       # Python dependencies
└── README.md
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `POST` | `/api/datasets/upload` | Upload and profile training CSV |
| `GET` | `/api/datasets` | List uploaded datasets |
| `GET` | `/api/datasets/{id}` | Get dataset profiling metadata & preview |
| `GET` | `/api/samples` | List available demo datasets |
| `POST` | `/api/samples/load/{sample_id}` | Load demo dataset with 1-click |
| `GET` | `/api/samples/download-test/{sample_id}` | Download pre-matched test CSV |
| `POST` | `/api/models/train` | Launch AutoML model training & benchmarking |
| `GET` | `/api/models` | List all trained models |
| `GET` | `/api/models/{id}` | Get model evaluation metrics & leaderboard |
| `POST` | `/api/predict/batch` | Upload unlabelled CSV & get predictions |
| `POST` | `/api/predict/single` | Run real-time single-row simulation |
| `GET` | `/api/predictions` | List past prediction jobs |
| `GET` | `/api/predictions/{id}/download` | Download prediction CSV file |

