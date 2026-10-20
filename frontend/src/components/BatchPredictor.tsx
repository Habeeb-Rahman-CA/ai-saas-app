import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  Wand2, 
  Search, 
  AlertCircle,
  Info
} from 'lucide-react';
import { ModelSummary, BatchPredictionResult } from '../types';

interface BatchPredictorProps {
  models: ModelSummary[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
  onPredictionComplete: (result: BatchPredictionResult) => void;
}

export const BatchPredictor: React.FC<BatchPredictorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onPredictionComplete,
}) => {
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<BatchPredictionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModel = models.find((m) => m.id === selectedModelId) || models[0] || null;

  const handleFileUpload = async (file: File) => {
    if (!activeModel) {
      setErrorMsg('Please select a trained model first.');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Only CSV files can be processed.');
      return;
    }

    setErrorMsg(null);
    setIsPredicting(true);

    const formData = new FormData();
    formData.append('model_id', activeModel.id);
    formData.append('file', file);

    try {
      const res = await fetch('/api/predict/batch', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Prediction failed');
      }

      const result: BatchPredictionResult = await res.json();
      setPredictionResult(result);
      onPredictionComplete(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate predictions');
    } finally {
      setIsPredicting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredPreview = predictionResult
    ? predictionResult.preview.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  return (
    <div className="space-y-8">
      {/* Configuration & Input Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selection & Download Template */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-400" />
                Select Prediction Model
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose the trained algorithm to generate inferences on your unlabelled CSV.
              </p>
            </div>

            {models.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs text-amber-400/90">
                No models trained yet. Please train a model in Step 2 first.
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={activeModel?.id || ''}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.algorithm} • {m.task_type})
                    </option>
                  ))}
                </select>

                {activeModel && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Feature:</span>
                      <span className="font-mono text-indigo-300 font-semibold">{activeModel.target_column}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Winning Algorithm:</span>
                      <span className="text-slate-200">{activeModel.algorithm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Required Features:</span>
                      <span className="font-mono text-slate-400">{activeModel.features.length} inputs</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Download Sample Test CSV button */}
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Need a test dataset to try?</span>
            <div className="flex flex-col gap-2">
              <a
                href="/api/samples/download-test/customer_churn"
                download
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Download Sample Churn Test CSV</span>
              </a>
              <a
                href="/api/samples/download-test/housing_prices"
                download
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Sample Housing Test CSV</span>
              </a>
            </div>
          </div>
        </div>

        {/* Upload Test CSV Dropzone */}
        <div className="lg:col-span-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`h-full min-h-[260px] rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center ${
              isPredicting
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".csv"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mb-4">
              {isPredicting ? (
                <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <p className="text-base font-semibold text-slate-200">
              {isPredicting ? 'Executing Pipeline & Predicting Rows...' : 'Upload Unlabelled CSV for Batch Inference'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or <span className="text-indigo-400 underline font-medium">browse from your computer</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-3">
              Accepts any CSV with the model's required feature columns • Auto-imputes missing columns
            </p>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Predictions Output Section */}
      {predictionResult && (
        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          {/* Header & Download Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Batch Predictions Generated</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Successfully scored <span className="font-semibold text-white">{predictionResult.total_rows.toLocaleString()} rows</span> • Target column: <span className="font-mono text-indigo-300">{predictionResult.target_column}</span>
              </p>
            </div>

            <a
              href={`/api/predictions/${predictionResult.prediction_id}/download`}
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Enriched Predictions CSV</span>
            </a>
          </div>

          {/* Missing column notice if any */}
          {predictionResult.missing_features_imputed.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Note: Some feature columns were missing in the test CSV and were automatically imputed: {predictionResult.missing_features_imputed.join(', ')}
              </span>
            </div>
          )}

          {/* Distribution KPI Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Predictions Distribution Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(predictionResult.distribution).map(([key, val]) => (
                <div key={key} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    {key.replace('_', ' ')}
                  </span>
                  <div className="text-xl font-bold text-indigo-300 font-mono mt-1">
                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Predictions Preview (First 25 Rows)
              </h4>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    {predictionResult.preview.length > 0 &&
                      Object.keys(predictionResult.preview[0]).map((col) => {
                        const isPred = col === predictionResult.prediction_column;
                        const isConf = col === 'confidence_pct';
                        return (
                          <th
                            key={col}
                            className={`py-2.5 px-3 whitespace-nowrap ${
                              isPred
                                ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                                : isConf
                                ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                                : ''
                            }`}
                          >
                            {col} {isPred ? '★' : ''}
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {filteredPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      {Object.entries(row).map(([col, val]) => {
                        const isPred = col === predictionResult.prediction_column;
                        const isConf = col === 'confidence_pct';
                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 whitespace-nowrap ${
                              isPred
                                ? 'bg-indigo-500/10 text-indigo-300 font-bold font-mono'
                                : isConf
                                ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                                : 'text-slate-300'
                            }`}
                          >
                            {isConf && typeof val === 'number' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                {val}%
                              </span>
                            ) : val !== null && val !== undefined ? (
                              String(val)
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
