import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = "data/saas.db"

def get_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        row_count INTEGER,
        col_count INTEGER,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        dataset_id TEXT,
        name TEXT NOT NULL,
        target_column TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        task_type TEXT NOT NULL,
        primary_metric REAL,
        file_path TEXT NOT NULL,
        metrics_json TEXT,
        features_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        row_count INTEGER,
        file_path TEXT NOT NULL,
        distribution_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (model_id) REFERENCES models(id)
    )
    """)
    conn.commit()
    conn.close()

def save_dataset_meta(dataset_id: str, name: str, filename: str, row_count: int, col_count: int, file_path: str):
    conn = get_db()
    conn.cursor().execute("""
    INSERT INTO datasets (id, name, original_filename, row_count, col_count, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (dataset_id, name, filename, row_count, col_count, file_path, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def list_datasets() -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.cursor().execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results

def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.cursor().execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_model_meta(model_id: str, dataset_id: Optional[str], name: str, target: str, algorithm: str, task_type: str, primary_metric: float, file_path: str, metrics: dict, features: list):
    conn = get_db()
    conn.cursor().execute("""
    INSERT INTO models (id, dataset_id, name, target_column, algorithm, task_type, primary_metric, file_path, metrics_json, features_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (model_id, dataset_id, name, target, algorithm, task_type, primary_metric, file_path, json.dumps(metrics), json.dumps(features), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def list_models() -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.cursor().execute("""
    SELECT m.*, d.name as dataset_name 
    FROM models m
    LEFT JOIN datasets d ON m.dataset_id = d.id
    ORDER BY m.created_at DESC
    """).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["metrics"] = json.loads(d.pop("metrics_json") or "{}")
        d["features"] = json.loads(d.pop("features_json") or "[]")
        results.append(d)
    conn.close()
    return results

def get_model(model_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.cursor().execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    d["metrics"] = json.loads(d.pop("metrics_json") or "{}")
    d["features"] = json.loads(d.pop("features_json") or "[]")
    conn.close()
    return d

def save_prediction_meta(pred_id: str, model_id: str, filename: str, row_count: int, file_path: str, distribution: dict):
    conn = get_db()
    conn.cursor().execute("""
    INSERT INTO predictions (id, model_id, original_filename, row_count, file_path, distribution_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (pred_id, model_id, filename, row_count, file_path, json.dumps(distribution), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def list_predictions() -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.cursor().execute("""
    SELECT p.*, m.name as model_name, m.target_column, m.task_type
    FROM predictions p
    JOIN models m ON p.model_id = m.id
    ORDER BY p.created_at DESC
    """).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["distribution"] = json.loads(d.pop("distribution_json") or "{}")
        results.append(d)
    conn.close()
    return results

def get_prediction(pred_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.cursor().execute("SELECT * FROM predictions WHERE id = ?", (pred_id,)).fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    d["distribution"] = json.loads(d.pop("distribution_json") or "{}")
    conn.close()
    return d

