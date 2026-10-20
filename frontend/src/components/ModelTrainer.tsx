import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trophy, 
  Cpu, 
  BarChart2, 
  Check, 
  Sparkles,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { DatasetRecord, DatasetProfile, ModelSummary, ModelDetails } from '../types';

interface ModelTrainerProps {
  datasets: DatasetRecord[];
  selectedDataset: DatasetRecord | null;
  datasetProfile: DatasetProfile | null;
  models: ModelSummary[];
  selectedModel: ModelDetails | null;
  initialTarget?: string;
  onSelectDataset: (record: DatasetRecord) => void;
  onSelectModel: (modelId: string) => void;
  onModelTrained: (modelSummary: ModelSummary, details: ModelDetails) => void;
  onProceedToPredict: (modelId: string) => void;
  onProceedToSimulator: (modelId: string) => void;
}

export const ModelTrainer: React.FC<ModelTrainerProps> = ({
  datasets,
  selectedDataset,
  datasetProfile,
  models,
  selectedModel,
  initialTarget,
  onSelectDataset,
  onSelectModel,
  onModelTrained,
  onProceedToPredict,
  onProceedToSimulator,
}) => {
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [taskOverride, setTaskOverride] = useState<'auto' | 'classification' | 'regression'>('auto');
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  // Sync target column when profile or initial target changes
  useEffect(() => {
    if (initialTarget) {
      setTargetColumn(initialTarget);
    } else if (datasetProfile && datasetProfile.columns.length > 0) {
      const rec = datasetProfile.columns.find((c) => c.target_recommendation);
      if (rec) {
        setTargetColumn(rec.name);
      } else {
        setTargetColumn(datasetProfile.columns[datasetProfile.columns.length - 1].name);
      }
    }
  }, [datasetProfile, initialTarget]);

  // Pre-fill ignored columns (e.g. ID columns)
  useEffect(() => {
    if (datasetProfile) {
      const ids = datasetProfile.columns
        .filter((c) => c.name.toLowerCase().endsWith('_id') || c.name.toLowerCase() === 'id')
        .map((c) => c.name);
      setIgnoredColumns(ids);
    }
  }, [datasetProfile]);

  const toggleIgnoredColumn = (colName: string) => {
    setIgnoredColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const handleStartTraining = async () => {
    if (!selectedDataset || !targetColumn) return;

    setIsTraining(true);
    setTrainingError(null);

    try {
      const res = await fetch('/api/models/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          target_column: targetColumn,
          model_name: modelName.trim() || undefined,
          ignored_columns: ignoredColumns,
          task_override: taskOverride === 'auto' ? undefined : taskOverride,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Training failed');
      }

      const trainResult = await res.json();

      // Fetch full details of newly trained model
      const detailRes = await fetch(`/api/models/${trainResult.model_id}`);
      const detailData = await detailRes.json();

      const summary: ModelSummary = {
        id: trainResult.model_id,
        dataset_id: selectedDataset.id,
        dataset_name: selectedDataset.name,
        name: trainResult.model_name,
        target_column: trainResult.target_column,
        algorithm: trainResult.best_algorithm,
        task_type: trainResult.task_type,
        primary_metric: trainResult.metrics.f1_score || trainResult.metrics.r2_score || 0,
        metrics: trainResult.metrics,
        features: trainResult.feature_columns,
        created_at: new Date().toISOString(),
      };

      onModelTrained(summary, detailData);
    } catch (err: any) {
      setTrainingError(err.message || 'AutoML training failed');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Configuration & Training Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                AutoML Training Configurator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically pre-processes features, trains multiple baseline models, tunes hyperparameters, and selects the winner.
              </p>
            </div>
            {isTraining && (
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Training in progress...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Choose Dataset */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                1. Select Training Dataset
              </label>
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => {
                  const found = datasets.find((d) => d.id === e.target.value);
                  if (found) onSelectDataset(found);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows, {d.col_count} cols)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Column */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                2. Target Column to Predict
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {datasetProfile?.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type}{c.target_recommendation ? ` • Rec: ${c.target_recommendation}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Name & Task Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Model Name (Optional)
              </label>
              <input
                type="text"
                placeholder={selectedDataset ? `${selectedDataset.name} Predictor` : 'Custom Model Name'}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Task Type Detection
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'classification', 'regression'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaskOverride(t)}
                    className={`py-2 text-xs rounded-xl border capitalize font-medium transition-all ${
                      taskOverride === t
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exclude ID / Unwanted columns */}
          {datasetProfile && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Feature Column Selection (Uncheck to Exclude / IDs / Noise)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {datasetProfile.columns.length - 1 - ignoredColumns.length} active features
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                {datasetProfile.columns
                  .filter((c) => c.name !== targetColumn)
                  .map((c) => {
                    const isIgnored = ignoredColumns.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleIgnoredColumn(c.name)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 transition-all ${
                          isIgnored
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 line-through'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {!isIgnored && <Check className="w-3 h-3 text-indigo-400" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleStartTraining}
              disabled={isTraining || !selectedDataset || !targetColumn}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                isTraining || !selectedDataset || !targetColumn
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white shadow-lg shadow-indigo-500/25'
              }`}
            >
              {isTraining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Training Candidate Algorithms...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch AutoML Training</span>
                </>
              )}
            </button>

            <span className="text-xs text-slate-500 hidden sm:block">
              Auto-evaluates Random Forest, Gradient Boosting & Linear/Logistic baselines
            </span>
          </div>

          {trainingError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{trainingError}</span>
            </div>
          )}
        </div>

        {/* Right Col: Trained Models Library */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Trained Models ({models.length})
              </h3>
            </div>

            {models.length === 0 ? (
              <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center text-xs text-slate-500">
                No models trained yet. Click "Launch AutoML Training" to benchmark algorithms.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {models.map((m) => {
                  const isSelected = selectedModel?.metadata.id === m.id;
                  const isClassification = m.task_type === 'classification';
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectModel(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                          : 'border-slate-800/80 bg-slate-950/50 hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate max-w-[150px]">{m.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isClassification
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isClassification ? `F1: ${(m.primary_metric * 100).toFixed(1)}%` : `R²: ${m.primary_metric.toFixed(3)}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span className="truncate">{m.algorithm}</span>
                        <span className="font-mono text-slate-500 text-[10px]">
                          Target: {m.target_column}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Selected model is ready for batch CSV inference and simulator.
          </div>
        </div>
      </div>

      {/* Selected Model Performance Dashboard */}
      {selectedModel && (
        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          {/* Dashboard Header & CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-lg font-bold text-white">{selectedModel.metadata.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-semibold">
                  Winner: {selectedModel.metadata.algorithm}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Trained on {selectedModel.training_samples} rows • Target: <span className="font-mono text-indigo-300">{selectedModel.metadata.target_column}</span> • Task: {selectedModel.metadata.task_type}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onProceedToSimulator(selectedModel.metadata.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>What-If Simulator</span>
              </button>
              <button
                onClick={() => onProceedToPredict(selectedModel.metadata.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <span>Predict on CSV</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {selectedModel.metadata.task_type === 'classification' ? (
              <>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Weighted F1-Score</span>
                  <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                    {((selectedModel.metadata.metrics.f1_score || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Accuracy</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                    {((selectedModel.metadata.metrics.accuracy || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Precision</span>
                  <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                    {((selectedModel.metadata.metrics.precision || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Recall</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                    {((selectedModel.metadata.metrics.recall || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">R² Determination Score</span>
                  <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                    {selectedModel.metadata.metrics.r2_score?.toFixed(3)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Mean Absolute Error (MAE)</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                    {selectedModel.metadata.metrics.mae?.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Root Mean Sq. Error (RMSE)</span>
                  <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                    {selectedModel.metadata.metrics.rmse?.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Features Considered</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                    {selectedModel.metadata.features.length}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Candidate Leaderboard & Feature Importances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algorithm Leaderboard */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Algorithm Leaderboard & Benchmarks
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 border-b border-slate-800 pb-2">
                    <tr>
                      <th className="py-2 px-2">Algorithm</th>
                      <th className="py-2 px-2">
                        {selectedModel.metadata.task_type === 'classification' ? 'F1-Score' : 'R² Score'}
                      </th>
                      <th className="py-2 px-2">
                        {selectedModel.metadata.task_type === 'classification' ? 'Accuracy' : 'MAE'}
                      </th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedModel.candidate_models.map((cand, idx) => {
                      const isWinner = cand.algorithm === selectedModel.metadata.algorithm;
                      return (
                        <tr key={cand.algorithm} className={isWinner ? 'bg-indigo-500/10' : ''}>
                          <td className="py-2.5 px-2 font-medium text-slate-200">
                            {cand.algorithm}
                          </td>
                          <td className="py-2.5 px-2 font-mono font-semibold text-indigo-300">
                            {cand.f1_score !== undefined
                              ? `${(cand.f1_score * 100).toFixed(1)}%`
                              : cand.r2_score?.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-300">
                            {cand.accuracy !== undefined
                              ? `${(cand.accuracy * 100).toFixed(1)}%`
                              : cand.mae?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2">
                            {isWinner ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                Best Model
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">Baseline #{idx + 1}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importance Bar Chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                Key Drivers & Feature Importance
              </h4>
              {selectedModel.feature_importances.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  Linear / Ridge coefficients normalized.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
                  {selectedModel.feature_importances.map((item) => (
                    <div key={item.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 truncate max-w-[200px]">{item.feature}</span>
                        <span className="font-mono text-indigo-300 font-semibold">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Confusion Matrix (If Classification) */}
          {selectedModel.metadata.task_type === 'classification' &&
            selectedModel.metadata.metrics.confusion_matrix && (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Confusion Matrix Grid
                </h4>
                <div className="inline-block rounded-lg border border-slate-800 overflow-hidden">
                  <table className="text-center text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2 border-r border-slate-800">Actual \ Predicted</th>
                        {selectedModel.classes.map((cls) => (
                          <th key={cls} className="p-2 border-r border-slate-800">Class {cls}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedModel.metadata.metrics.confusion_matrix.map((row, rIdx) => (
                        <tr key={rIdx} className="border-t border-slate-800">
                          <td className="p-2 font-semibold bg-slate-900 text-slate-400 border-r border-slate-800">
                            Class {selectedModel.classes[rIdx] || rIdx}
                          </td>
                          {row.map((val, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            return (
                              <td
                                key={cIdx}
                                className={`p-2 border-r border-slate-800 font-bold ${
                                  isDiagonal ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
