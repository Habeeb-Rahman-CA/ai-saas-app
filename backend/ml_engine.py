import os
import uuid
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score,
    r2_score, mean_absolute_error, mean_squared_error
)

class MLEngine:
    @staticmethod
    def profile_csv(file_path: str) -> Dict[str, Any]:
        """Profiles a CSV file returning summary statistics, data types, missing counts, and preview."""
        df = pd.read_csv(file_path)
        total_rows, total_cols = df.shape

        column_info = []
        for col in df.columns:
            series = df[col]
            missing_count = int(series.isna().sum())
            missing_pct = round((missing_count / total_rows) * 100, 2) if total_rows > 0 else 0
            n_unique = int(series.nunique())
            
            is_numeric = pd.api.types.is_numeric_dtype(series)
            is_bool = pd.api.types.is_bool_dtype(series)
            
            if is_bool:
                col_type = "boolean"
            elif is_numeric:
                col_type = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(series):
                col_type = "datetime"
            else:
                col_type = "categorical"

            # Sample values (non-null)
            samples = series.dropna().head(3).tolist()

            # Recommendation for target
            target_recommendation = None
            if col.lower() in ["target", "label", "churn", "price", "sale_price", "outcome", "class", "status", "salary"]:
                target_recommendation = "High"
            elif col_type in ["categorical", "boolean"] and 2 <= n_unique <= 20:
                target_recommendation = "Classification"
            elif col_type == "numeric" and n_unique > 10:
                target_recommendation = "Regression"

            column_info.append({
                "name": col,
                "type": col_type,
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": n_unique,
                "sample_values": [str(x) for x in samples],
                "target_recommendation": target_recommendation
            })

        preview_rows = df.head(10).replace({np.nan: None}).to_dict(orient="records")

        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "columns": column_info,
            "preview": preview_rows
        }

    @staticmethod
    def train_automl(
        file_path: str,
        target_column: str,
        model_name: str,
        ignored_columns: Optional[List[str]] = None,
        task_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Runs AutoML training on the provided dataset and target column."""
        df = pd.read_csv(file_path)

        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in CSV.")

        # Drop rows where target is NaN
        df = df.dropna(subset=[target_column]).reset_index(drop=True)
        if len(df) < 15:
            raise ValueError("Dataset has fewer than 15 valid rows. Need more data to train.")

        # Exclude ignored columns
        ignored = ignored_columns or []
        # Auto-detect likely ID columns if not already ignored
        for col in df.columns:
            if col != target_column and col not in ignored:
                if col.lower().endswith(("_id", "id")) or (df[col].nunique() == len(df) and df[col].dtype == object):
                    ignored.append(col)

        feature_cols = [c for c in df.columns if c != target_column and c not in ignored]
        if not feature_cols:
            raise ValueError("No feature columns available to train after exclusions.")

        X = df[feature_cols].copy()
        y = df[target_column].copy()

        # Determine task type
        target_series = y
        target_unique = target_series.nunique()
        target_is_numeric = pd.api.types.is_numeric_dtype(target_series)

        if task_override and task_override in ["classification", "regression"]:
            task_type = task_override
        else:
            if not target_is_numeric or target_unique <= 10 or pd.api.types.is_bool_dtype(target_series):
                task_type = "classification"
            else:
                task_type = "regression"

        label_encoder = None
        if task_type == "classification":
            y = y.astype(str)
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y)
            classes = label_encoder.classes_.tolist()
        else:
            y_encoded = pd.to_numeric(y, errors="coerce").fillna(y.median()).to_numpy()
            classes = []

        # Identify numeric vs categorical feature columns
        numeric_features = [c for c in feature_cols if pd.api.types.is_numeric_dtype(X[c])]
        categorical_features = [c for c in feature_cols if c not in numeric_features]

        # Transformers
        transformers = []
        if numeric_features:
            num_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler())
            ])
            transformers.append(("num", num_pipe, numeric_features))

        if categorical_features:
            cat_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
            ])
            transformers.append(("cat", cat_pipe, categorical_features))

        preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")

        # Train/test split
        stratify = y_encoded if task_type == "classification" and min(pd.Series(y_encoded).value_counts()) >= 2 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=stratify
        )

        candidate_results = []
        best_pipeline = None
        best_score = -float("inf")
        best_model_name = ""

        if task_type == "classification":
            models = {
                "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42),
                "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
            }

            for name, clf in models.items():
                pipe = Pipeline([
                    ("preprocessor", preprocessor),
                    ("classifier", clf)
                ])
                pipe.fit(X_train, y_train)
                preds = pipe.predict(X_test)
                
                acc = float(accuracy_score(y_test, preds))
                f1 = float(f1_score(y_test, preds, average="weighted", zero_division=0))
                prec = float(precision_score(y_test, preds, average="weighted", zero_division=0))
                rec = float(recall_score(y_test, preds, average="weighted", zero_division=0))

                candidate_results.append({
                    "algorithm": name,
                    "accuracy": round(acc, 4),
                    "f1_score": round(f1, 4),
                    "precision": round(prec, 4),
                    "recall": round(rec, 4),
                    "primary_metric": round(f1, 4)
                })

                if f1 > best_score:
                    best_score = f1
                    best_pipeline = pipe
                    best_model_name = name

            # Compute detailed metrics on best model
            final_preds = best_pipeline.predict(X_test)
            cm = confusion_matrix(y_test, final_preds).tolist()
            detailed_metrics = {
                "accuracy": round(float(accuracy_score(y_test, final_preds)), 4),
                "f1_score": round(float(f1_score(y_test, final_preds, average="weighted", zero_division=0)), 4),
                "precision": round(float(precision_score(y_test, final_preds, average="weighted", zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, final_preds, average="weighted", zero_division=0)), 4),
                "confusion_matrix": cm,
                "classes": classes
            }

        else:
            models = {
                "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
                "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42),
                "Ridge Regression": Ridge(alpha=1.0)
            }

            for name, reg in models.items():
                pipe = Pipeline([
                    ("preprocessor", preprocessor),
                    ("regressor", reg)
                ])
                pipe.fit(X_train, y_train)
                preds = pipe.predict(X_test)

                r2 = float(r2_score(y_test, preds))
                mae = float(mean_absolute_error(y_test, preds))
                rmse = float(np.sqrt(mean_squared_error(y_test, preds)))

                candidate_results.append({
                    "algorithm": name,
                    "r2_score": round(r2, 4),
                    "mae": round(mae, 2),
                    "rmse": round(rmse, 2),
                    "primary_metric": round(r2, 4)
                })

                if r2 > best_score:
                    best_score = r2
                    best_pipeline = pipe
                    best_model_name = name

            final_preds = best_pipeline.predict(X_test)
            detailed_metrics = {
                "r2_score": round(float(r2_score(y_test, final_preds)), 4),
                "mae": round(float(mean_absolute_error(y_test, final_preds)), 2),
                "rmse": round(float(np.sqrt(mean_squared_error(y_test, final_preds))), 2),
            }

        # Extract Feature Importances
        feature_importances = []
        try:
            fitted_prep = best_pipeline.named_steps["preprocessor"]
            feature_names = []
            if hasattr(fitted_prep, "get_feature_names_out"):
                raw_names = fitted_prep.get_feature_names_out()
                feature_names = [f.replace("num__", "").replace("cat__", "") for f in raw_names]
            
            final_estimator = best_pipeline.named_steps.get("classifier") or best_pipeline.named_steps.get("regressor")
            if hasattr(final_estimator, "feature_importances_"):
                importances = final_estimator.feature_importances_
            elif hasattr(final_estimator, "coef_"):
                importances = np.abs(final_estimator.coef_).flatten()
            else:
                importances = []

            if len(importances) == len(feature_names) and len(importances) > 0:
                imp_pairs = sorted(zip(feature_names, [float(x) for x in importances]), key=lambda p: p[1], reverse=True)
                total_imp = sum(x[1] for x in imp_pairs) or 1.0
                for feat, val in imp_pairs[:12]:
                    feature_importances.append({
                        "feature": feat,
                        "importance": round(val, 4),
                        "percentage": round((val / total_imp) * 100, 1)
                    })
        except Exception as e:
            print(f"Notice: Feature importance extraction notice: {e}")

        # Retrain best pipeline on full dataset for maximum inference quality
        best_pipeline.fit(X, y_encoded)

        # Save model
        model_id = str(uuid.uuid4())
        model_save_dir = "data/models"
        os.makedirs(model_save_dir, exist_ok=True)
        model_file_path = os.path.join(model_save_dir, f"{model_id}.joblib")

        saved_payload = {
            "model_id": model_id,
            "model_name": model_name,
            "pipeline": best_pipeline,
            "task_type": task_type,
            "best_algorithm": best_model_name,
            "target_column": target_column,
            "feature_columns": feature_cols,
            "numeric_features": numeric_features,
            "categorical_features": categorical_features,
            "ignored_columns": ignored,
            "label_encoder": label_encoder,
            "classes": classes,
            "metrics": detailed_metrics,
            "candidate_models": candidate_results,
            "feature_importances": feature_importances,
            "training_samples": len(df)
        }

        joblib.dump(saved_payload, model_file_path)

        return {
            "model_id": model_id,
            "model_name": model_name,
            "task_type": task_type,
            "best_algorithm": best_model_name,
            "target_column": target_column,
            "feature_columns": feature_cols,
            "ignored_columns": ignored,
            "metrics": detailed_metrics,
            "candidate_models": candidate_results,
            "feature_importances": feature_importances,
            "training_samples": len(df)
        }

    @staticmethod
    def predict_csv(model_id: str, csv_path: str) -> Dict[str, Any]:
        """Runs batch predictions on a new CSV file using the trained model artifact."""
        model_path = os.path.join("data/models", f"{model_id}.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {model_id} not found.")

        meta = joblib.load(model_path)
        pipeline = meta["pipeline"]
        feature_cols = meta["feature_columns"]
        task_type = meta["task_type"]
        label_encoder = meta["label_encoder"]

        df_in = pd.read_csv(csv_path)
        original_cols = list(df_in.columns)

        # Prepare X with required features
        X_pred = pd.DataFrame(index=df_in.index)
        missing_features = []
        for col in feature_cols:
            if col in df_in.columns:
                X_pred[col] = df_in[col]
            else:
                missing_features.append(col)
                # Fallback fill
                if col in meta["numeric_features"]:
                    X_pred[col] = 0.0
                else:
                    X_pred[col] = "Missing"

        # Generate predictions
        raw_preds = pipeline.predict(X_pred)

        df_out = df_in.copy()

        if task_type == "classification":
            if label_encoder is not None:
                decoded_preds = label_encoder.inverse_transform(raw_preds)
            else:
                decoded_preds = raw_preds

            df_out["predicted_" + meta["target_column"]] = decoded_preds

            # Check if predict_proba is available
            try:
                probs = pipeline.predict_proba(X_pred)
                # Max probability as confidence
                confidences = np.max(probs, axis=1)
                df_out["confidence_pct"] = np.round(confidences * 100, 1)
            except Exception:
                pass

        else:
            # Regression
            df_out["predicted_" + meta["target_column"]] = np.round(raw_preds, 2)

        pred_id = str(uuid.uuid4())
        out_dir = "data/predictions"
        os.makedirs(out_dir, exist_ok=True)
        out_csv_path = os.path.join(out_dir, f"{pred_id}.csv")
        df_out.to_csv(out_csv_path, index=False)

        preview = df_out.head(25).replace({np.nan: None}).to_dict(orient="records")

        # Compute summary stats on predictions
        target_pred_col = "predicted_" + meta["target_column"]
        distribution = {}
        if task_type == "classification":
            val_counts = df_out[target_pred_col].value_counts().to_dict()
            distribution = {str(k): int(v) for k, v in val_counts.items()}
        else:
            distribution = {
                "min": float(np.round(df_out[target_pred_col].min(), 2)),
                "max": float(np.round(df_out[target_pred_col].max(), 2)),
                "mean": float(np.round(df_out[target_pred_col].mean(), 2)),
                "median": float(np.round(df_out[target_pred_col].median(), 2))
            }

        return {
            "prediction_id": pred_id,
            "model_id": model_id,
            "target_column": meta["target_column"],
            "prediction_column": target_pred_col,
            "total_rows": len(df_out),
            "preview": preview,
            "distribution": distribution,
            "missing_features_imputed": missing_features,
            "output_file": f"{pred_id}.csv"
        }

    @staticmethod
    def predict_single_row(model_id: str, row_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs a real-time single row prediction for interactive what-if scenarios."""
        model_path = os.path.join("data/models", f"{model_id}.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {model_id} not found.")

        meta = joblib.load(model_path)
        pipeline = meta["pipeline"]
        feature_cols = meta["feature_columns"]
        task_type = meta["task_type"]
        label_encoder = meta["label_encoder"]

        df_single = pd.DataFrame([row_data])
        # Ensure all columns exist
        for col in feature_cols:
            if col not in df_single.columns:
                if col in meta["numeric_features"]:
                    df_single[col] = 0.0
                else:
                    df_single[col] = "Missing"

        df_single = df_single[feature_cols]

        raw_pred = pipeline.predict(df_single)[0]
        confidence = None

        if task_type == "classification":
            if label_encoder is not None:
                predicted_val = str(label_encoder.inverse_transform([raw_pred])[0])
            else:
                predicted_val = str(raw_pred)

            try:
                probs = pipeline.predict_proba(df_single)[0]
                classes = meta["classes"]
                confidence = float(np.round(np.max(probs) * 100, 1))
                prob_breakdown = {str(classes[i]): round(float(probs[i]) * 100, 1) for i in range(len(classes))}
            except Exception:
                prob_breakdown = {}
        else:
            predicted_val = float(np.round(raw_pred, 2))
            prob_breakdown = {}

        return {
            "prediction": predicted_val,
            "confidence_pct": confidence,
            "probability_breakdown": prob_breakdown,
            "task_type": task_type,
            "target_column": meta["target_column"]
        }

