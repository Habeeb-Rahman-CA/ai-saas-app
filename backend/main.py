import os
import sys
import shutil
import uuid
import pandas as pd
from typing import Optional, List, Dict, Any

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ml_engine import MLEngine
import storage
import sample_data

app = FastAPI(title="Predictr AI SaaS API", version="1.0.0")

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    os.makedirs("data/datasets", exist_ok=True)
    os.makedirs("data/models", exist_ok=True)
    os.makedirs("data/predictions", exist_ok=True)
    storage.init_db()
    sample_data.generate_sample_datasets()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Predictr AutoML SaaS"}

# ================= DATASETS =================

@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...), name: Optional[str] = Form(None)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported.")

    dataset_id = str(uuid.uuid4())
    save_path = os.path.join("data/datasets", f"{dataset_id}.csv")

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        profile = MLEngine.profile_csv(save_path)
        display_name = name or file.filename.replace(".csv", "").replace("_", " ").title()

        storage.save_dataset_meta(
            dataset_id=dataset_id,
            name=display_name,
            filename=file.filename,
            row_count=profile["total_rows"],
            col_count=profile["total_columns"],
            file_path=save_path
        )

        return {
            "dataset_id": dataset_id,
            "name": display_name,
            "filename": file.filename,
            "profile": profile
        }
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@app.get("/api/datasets")
def get_datasets():
    return storage.list_datasets()

@app.get("/api/datasets/{dataset_id}")
def get_dataset_details(dataset_id: str):
    record = storage.get_dataset(dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    profile = MLEngine.profile_csv(record["file_path"])
    return {
        "metadata": record,
        "profile": profile
    }

# ================= SAMPLE DATASETS =================

@app.get("/api/samples")
def list_sample_datasets():
    samples = [
        {
            "id": "customer_churn",
            "name": "Customer Churn (Telecom)",
            "task_type": "classification",
            "target_column": "churn",
            "description": "Predict whether telecom subscribers will cancel their subscription based on tenure, service plans, and charges.",
            "train_file": "customer_churn_train.csv",
            "test_file": "customer_churn_test.csv"
        },
        {
            "id": "housing_prices",
            "name": "Real Estate Valuation (Housing)",
            "task_type": "regression",
            "target_column": "sale_price",
            "description": "Predict residential home sales prices based on living area, bedrooms, condition, location, and age.",
            "train_file": "housing_prices_train.csv",
            "test_file": "housing_prices_test.csv"
        }
    ]
    return samples

@app.post("/api/samples/load/{sample_id}")
def load_sample_dataset(sample_id: str):
    sample_train_map = {
        "customer_churn": ("data/samples/customer_churn_train.csv", "Customer Churn Dataset", "customer_churn_train.csv"),
        "housing_prices": ("data/samples/housing_prices_train.csv", "Housing Prices Dataset", "housing_prices_train.csv")
    }

    if sample_id not in sample_train_map:
        raise HTTPException(status_code=404, detail="Sample dataset not found")

    src_path, display_name, orig_filename = sample_train_map[sample_id]
    dataset_id = str(uuid.uuid4())
    dest_path = os.path.join("data/datasets", f"{dataset_id}.csv")
    shutil.copyfile(src_path, dest_path)

    profile = MLEngine.profile_csv(dest_path)
    storage.save_dataset_meta(
        dataset_id=dataset_id,
        name=display_name,
        filename=orig_filename,
        row_count=profile["total_rows"],
        col_count=profile["total_columns"],
        file_path=dest_path
    )

    return {
        "dataset_id": dataset_id,
        "name": display_name,
        "filename": orig_filename,
        "profile": profile
    }

@app.get("/api/samples/download-test/{sample_id}")
def download_sample_test_csv(sample_id: str):
    sample_test_map = {
        "customer_churn": "data/samples/customer_churn_test.csv",
        "housing_prices": "data/samples/housing_prices_test.csv"
    }
    if sample_id not in sample_test_map:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    file_path = sample_test_map[sample_id]
    return FileResponse(file_path, filename=os.path.basename(file_path), media_type="text/csv")

# ================= TRAINING =================

class TrainRequest(BaseModel):
    dataset_id: str
    target_column: str
    model_name: Optional[str] = None
    ignored_columns: Optional[List[str]] = None
    task_override: Optional[str] = None

@app.post("/api/models/train")
def train_model(req: TrainRequest):
    record = storage.get_dataset(req.dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    display_name = req.model_name or f"{record['name']} - {req.target_column} Predictor"

    try:
        result = MLEngine.train_automl(
            file_path=record["file_path"],
            target_column=req.target_column,
            model_name=display_name,
            ignored_columns=req.ignored_columns,
            task_override=req.task_override
        )

        model_file_path = os.path.join("data/models", f"{result['model_id']}.joblib")
        primary_metric = (
            result["metrics"].get("f1_score", 0.0) 
            if result["task_type"] == "classification" 
            else result["metrics"].get("r2_score", 0.0)
        )

        storage.save_model_meta(
            model_id=result["model_id"],
            dataset_id=req.dataset_id,
            name=display_name,
            target=req.target_column,
            algorithm=result["best_algorithm"],
            task_type=result["task_type"],
            primary_metric=primary_metric,
            file_path=model_file_path,
            metrics=result["metrics"],
            features=result["feature_columns"]
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/api/models")
def get_models():
    return storage.list_models()

@app.get("/api/models/{model_id}")
def get_model_details(model_id: str):
    model = storage.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    import joblib
    try:
        meta = joblib.load(model["file_path"])
        return {
            "metadata": model,
            "candidate_models": meta.get("candidate_models", []),
            "feature_importances": meta.get("feature_importances", []),
            "classes": meta.get("classes", []),
            "numeric_features": meta.get("numeric_features", []),
            "categorical_features": meta.get("categorical_features", []),
            "training_samples": meta.get("training_samples", 0)
        }
    except Exception as e:
        return {"metadata": model, "error": str(e)}

# ================= PREDICTIONS =================

@app.post("/api/predict/batch")
async def batch_predict(model_id: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for inference.")

    model = storage.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    temp_id = str(uuid.uuid4())
    temp_csv_path = os.path.join("data/predictions", f"temp_{temp_id}.csv")

    try:
        with open(temp_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = MLEngine.predict_csv(model_id=model_id, csv_path=temp_csv_path)

        # Cleanup temp file
        if os.path.exists(temp_csv_path):
            os.remove(temp_csv_path)

        out_file_path = os.path.join("data/predictions", f"{result['prediction_id']}.csv")

        storage.save_prediction_meta(
            pred_id=result["prediction_id"],
            model_id=model_id,
            filename=file.filename,
            row_count=result["total_rows"],
            file_path=out_file_path,
            distribution=result["distribution"]
        )

        return result
    except Exception as e:
        if os.path.exists(temp_csv_path):
            os.remove(temp_csv_path)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

class SinglePredictRequest(BaseModel):
    model_id: str
    features: Dict[str, Any]

@app.post("/api/predict/single")
def single_predict(req: SinglePredictRequest):
    try:
        return MLEngine.predict_single_row(model_id=req.model_id, row_data=req.features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single prediction failed: {str(e)}")

@app.get("/api/predictions")
def get_predictions():
    return storage.list_predictions()

@app.get("/api/predictions/{prediction_id}/download")
def download_prediction_file(prediction_id: str):
    rec = storage.get_prediction(prediction_id)
    if not rec or not os.path.exists(rec["file_path"]):
        raise HTTPException(status_code=404, detail="Prediction output file not found")

    download_name = f"predictions_{rec['original_filename']}"
    return FileResponse(rec["file_path"], filename=download_name, media_type="text/csv")

# Mount built React frontend if available
from fastapi.staticfiles import StaticFiles
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

