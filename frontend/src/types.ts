export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: string[];
  target_recommendation?: string | null;
}

export interface DatasetProfile {
  total_rows: number;
  total_columns: number;
  columns: ColumnInfo[];
  preview: Record<string, any>[];
}

export interface DatasetRecord {
  id: string;
  name: string;
  original_filename: string;
  row_count: number;
  col_count: number;
  file_path: string;
  created_at: string;
}

export interface CandidateModel {
  algorithm: string;
  accuracy?: number;
  f1_score?: number;
  precision?: number;
  recall?: number;
  r2_score?: number;
  mae?: number;
  rmse?: number;
  primary_metric: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  percentage: number;
}

export interface ModelSummary {
  id: string;
  dataset_id?: string;
  dataset_name?: string;
  name: string;
  target_column: string;
  algorithm: string;
  task_type: 'classification' | 'regression';
  primary_metric: number;
  metrics: {
    accuracy?: number;
    f1_score?: number;
    precision?: number;
    recall?: number;
    r2_score?: number;
    mae?: number;
    rmse?: number;
    confusion_matrix?: number[][];
    classes?: string[];
  };
  features: string[];
  created_at: string;
}

export interface ModelDetails {
  metadata: ModelSummary;
  candidate_models: CandidateModel[];
  feature_importances: FeatureImportance[];
  classes: string[];
  numeric_features: string[];
  categorical_features: string[];
  training_samples: number;
}

export interface PredictionSummary {
  id: string;
  model_id: string;
  model_name: string;
  target_column: string;
  task_type: 'classification' | 'regression';
  original_filename: string;
  row_count: number;
  distribution: Record<string, any>;
  created_at: string;
}

export interface BatchPredictionResult {
  prediction_id: string;
  model_id: string;
  target_column: string;
  prediction_column: string;
  total_rows: number;
  preview: Record<string, any>[];
  distribution: Record<string, any>;
  missing_features_imputed: string[];
  output_file: string;
}

export interface SampleDataset {
  id: string;
  name: string;
  task_type: 'classification' | 'regression';
  target_column: string;
  description: string;
  train_file: string;
  test_file: string;
}
