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
    <div className="space-y-12">
      {/* Top Configuration & Training Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-8 space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-black flex items-center gap-2">
                <Cpu className="w-5 h-5 text-black stroke-[1.75]" />
                AutoML Pipeline Setup
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Automatic preprocessing • Ensemble benchmarking • Winner selection
              </p>
            </div>
            {isTraining && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-600 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-black" />
                Training...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Dataset
              </label>
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => {
                  const found = datasets.find((d) => d.id === e.target.value);
                  if (found) onSelectDataset(found);
                }}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-black font-medium"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Target Variable
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-black font-mono font-medium"
              >
                {datasetProfile?.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Model Name
              </label>
              <input
                type="text"
                placeholder={selectedDataset ? `${selectedDataset.name} Predictor` : 'Custom Model Name'}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Task Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'classification', 'regression'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaskOverride(t)}
                    className={`py-2 text-xs font-mono uppercase rounded-xl border transition-all ${
                      taskOverride === t
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feature selection */}
          {datasetProfile && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Included Features
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {datasetProfile.columns.length - 1 - ignoredColumns.length} Active
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
                {datasetProfile.columns
                  .filter((c) => c.name !== targetColumn)
                  .map((c) => {
                    const isIgnored = ignoredColumns.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleIgnoredColumn(c.name)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
                          isIgnored
                            ? 'bg-zinc-100 border-zinc-200 text-zinc-400 line-through'
                            : 'bg-white border-zinc-300 text-black shadow-2xs'
                        }`}
                      >
                        {!isIgnored && <Check className="w-3 h-3 text-black" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Action Button: Minimalist Icon + Label */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleStartTraining}
              disabled={isTraining || !selectedDataset || !targetColumn}
              title="Launch AutoML Training"
              className={`p-3.5 px-6 rounded-xl font-semibold text-xs tracking-tight transition-all cursor-pointer flex items-center gap-2.5 ${
                isTraining || !selectedDataset || !targetColumn
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-zinc-800 shadow-sm'
              }`}
            >
              {isTraining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Benchmarking...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current stroke-none" />
                  <span>Start Training</span>
                </>
              )}
            </button>

            <span className="text-xs font-mono text-zinc-400 hidden sm:block">
              Auto-scores baseline algorithms
            </span>
          </div>

          {trainingError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{trainingError}</span>
            </div>
          )}
        </div>

        {/* Right: Trained Models Archive */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-black" />
                Models ({models.length})
              </h3>
            </div>

            {models.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-zinc-200 text-center text-xs font-mono text-zinc-400">
                No models trained
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {models.map((m) => {
                  const isSelected = selectedModel?.metadata.id === m.id;
                  const isClass = m.task_type === 'classification';
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectModel(m.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-black bg-black text-white shadow-sm'
                          : 'border-zinc-200 bg-white hover:border-zinc-400 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate max-w-[140px]">{m.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-black'
                        }`}>
                          {isClass ? `F1: ${(m.primary_metric * 100).toFixed(1)}%` : `R²: ${m.primary_metric.toFixed(3)}`}
                        </span>
                      </div>
                      <div className={`text-[10px] font-mono flex items-center justify-between ${
                        isSelected ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        <span className="truncate">{m.algorithm}</span>
                        <span>{m.target_column}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] font-mono text-zinc-400 pt-4 border-t border-zinc-100">
            Selected model ready for scoring
          </p>
        </div>
      </div>

      {/* Selected Model Deep Dive */}
      {selectedModel && (
        <div className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-8">
          {/* Header & Minimalist Actions */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold tracking-tight text-black">{selectedModel.metadata.name}</h3>
                <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold border border-zinc-200">
                  {selectedModel.metadata.algorithm}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Trained on {selectedModel.training_samples} rows • Target: {selectedModel.metadata.target_column} • Task: {selectedModel.metadata.task_type}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onProceedToSimulator(selectedModel.metadata.id)}
                title="Open Simulator"
                className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-black transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-4 h-4 stroke-[1.75]" />
              </button>
              <button
                onClick={() => onProceedToPredict(selectedModel.metadata.id)}
                title="Batch Predict CSV"
                className="p-3 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* Minimalist KPI Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {selectedModel.metadata.task_type === 'classification' ? (
              <>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">F1 Score</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {((selectedModel.metadata.metrics.f1_score || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Accuracy</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {((selectedModel.metadata.metrics.accuracy || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Precision</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {((selectedModel.metadata.metrics.precision || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Recall</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {((selectedModel.metadata.metrics.recall || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">R² Score</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {selectedModel.metadata.metrics.r2_score?.toFixed(3)}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">MAE</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {selectedModel.metadata.metrics.mae?.toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">RMSE</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {selectedModel.metadata.metrics.rmse?.toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Features</span>
                  <div className="text-3xl font-extrabold text-black font-mono mt-1">
                    {selectedModel.metadata.features.length}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Leaderboard & Feature Importances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-black" />
                Algorithm Benchmarks
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-zinc-400 border-b border-zinc-100 pb-2">
                    <tr>
                      <th className="py-2">Algorithm</th>
                      <th className="py-2">Primary</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {selectedModel.candidate_models.map((cand) => {
                      const isWinner = cand.algorithm === selectedModel.metadata.algorithm;
                      return (
                        <tr key={cand.algorithm} className={isWinner ? 'bg-zinc-50 font-bold' : ''}>
                          <td className="py-2.5 text-zinc-900">{cand.algorithm}</td>
                          <td className="py-2.5 text-black">
                            {cand.f1_score !== undefined
                              ? `${(cand.f1_score * 100).toFixed(1)}%`
                              : cand.r2_score?.toFixed(3)}
                          </td>
                          <td className="py-2.5">
                            {isWinner ? (
                              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-black text-white font-bold">
                                Winner
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">Baseline</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importances Minimalist Bar Chart */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-black" />
                Feature Weights
              </h4>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {selectedModel.feature_importances.map((item) => (
                  <div key={item.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-800 truncate max-w-[200px]">{item.feature}</span>
                      <span className="text-black font-bold">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
