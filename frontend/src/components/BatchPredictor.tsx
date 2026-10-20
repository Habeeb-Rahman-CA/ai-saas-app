import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Download, 
  Check, 
  Wand2, 
  Search, 
  AlertCircle,
  FileDown
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
      setErrorMsg('Please select a trained model');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Only .csv files supported');
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
        throw new Error(err.detail || 'Inference failed');
      }

      const result: BatchPredictionResult = await res.json();
      setPredictionResult(result);
      onPredictionComplete(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to score dataset');
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
    <div className="space-y-12">
      {/* Configuration & Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Model Selection & Sample CSVs */}
        <div className="p-8 rounded-2xl border border-zinc-200 bg-white flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-black flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-black stroke-[1.75]" />
                Inference Model
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Select algorithm for scoring
              </p>
            </div>

            {models.length === 0 ? (
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono text-zinc-500">
                No models trained yet
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={activeModel?.id || ''}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-black font-medium"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.algorithm})
                    </option>
                  ))}
                </select>

                {activeModel && (
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Target:</span>
                      <span className="font-bold text-black">{activeModel.target_column}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Features:</span>
                      <span className="text-zinc-700">{activeModel.features.length} required</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Test CSV download triggers */}
          <div className="pt-6 border-t border-zinc-100 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
              Download Test Templates
            </span>
            <div className="flex items-center gap-3">
              <a
                href="/api/samples/download-test/customer_churn"
                download
                title="Download Churn Test CSV"
                className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black transition-all flex items-center justify-center flex-1 group"
              >
                <FileDown className="w-4 h-4 mr-2" />
                <span className="text-xs font-mono font-medium">Churn CSV</span>
              </a>
              <a
                href="/api/samples/download-test/housing_prices"
                download
                title="Download Housing Test CSV"
                className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black transition-all flex items-center justify-center flex-1 group"
              >
                <FileDown className="w-4 h-4 mr-2" />
                <span className="text-xs font-mono font-medium">Housing CSV</span>
              </a>
            </div>
          </div>
        </div>

        {/* Upload Test CSV Dropzone */}
        <div className="lg:col-span-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`h-full min-h-[260px] rounded-2xl border border-dashed p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              isPredicting
                ? 'border-black bg-zinc-50 scale-[0.99]'
                : 'border-zinc-300 hover:border-black bg-white hover:bg-zinc-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".csv"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-xl bg-black text-white flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
              {isPredicting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6 stroke-[1.75]" />
              )}
            </div>
            <p className="text-sm font-semibold text-black tracking-tight">
              {isPredicting ? 'Executing Predictions...' : 'Upload Unlabelled CSV for Scoring'}
            </p>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Supports any CSV matching trained feature schema
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Table & Download Trigger */}
      {predictionResult && (
        <div className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-8">
          {/* Header with Icon-Only Download Trigger */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-black stroke-[2.5]" />
                <h3 className="text-xl font-bold tracking-tight text-black">Predictions Ready</h3>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Scored {predictionResult.total_rows.toLocaleString()} records • Target: {predictionResult.target_column}
              </p>
            </div>

            <a
              href={`/api/predictions/${predictionResult.prediction_id}/download`}
              download
              title="Download Predictions CSV"
              className="p-3.5 px-6 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm flex items-center gap-2 group"
            >
              <Download className="w-4 h-4 stroke-[2]" />
              <span className="text-xs font-semibold tracking-tight">Export CSV</span>
            </a>
          </div>

          {/* KPI Distribution Summary */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Distribution Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(predictionResult.distribution).map(([key, val]) => (
                <div key={key} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    {key.replace('_', ' ')}
                  </span>
                  <div className="text-2xl font-bold text-black font-mono mt-1">
                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Data Preview (First 25 Rows)
              </h4>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-black font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
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
                                ? 'bg-zinc-900 text-white font-bold'
                                : isConf
                                ? 'bg-zinc-200 text-black font-bold'
                                : ''
                            }`}
                          >
                            {col}
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {filteredPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/70">
                      {Object.entries(row).map(([col, val]) => {
                        const isPred = col === predictionResult.prediction_column;
                        const isConf = col === 'confidence_pct';
                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 whitespace-nowrap ${
                              isPred
                                ? 'bg-zinc-50 text-black font-bold'
                                : isConf
                                ? 'text-black font-bold'
                                : ''
                            }`}
                          >
                            {isConf && typeof val === 'number' ? (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-black font-mono">
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
