import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Play, AlertCircle, RotateCcw } from 'lucide-react';
import { ModelSummary, ModelDetails } from '../types';

interface SinglePredictorProps {
  models: ModelSummary[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
}

export const SinglePredictor: React.FC<SinglePredictorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [featureInputs, setFeatureInputs] = useState<Record<string, any>>({});
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeModel = models.find((m) => m.id === selectedModelId) || models[0] || null;

  useEffect(() => {
    if (activeModel) {
      loadModelDetails(activeModel.id);
    }
  }, [activeModel?.id]);

  const loadModelDetails = async (id: string) => {
    setIsLoadingDetails(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/models/${id}`);
      if (!res.ok) throw new Error('Failed to load model details');
      const data: ModelDetails = await res.json();
      setModelDetails(data);

      const initial: Record<string, any> = {};
      data.metadata.features.forEach((feat) => {
        if (data.numeric_features.includes(feat)) {
          initial[feat] = 10;
        } else {
          initial[feat] = 'Standard';
        }
      });
      setFeatureInputs(initial);
      setPrediction(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading model metadata');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFeatureInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const runPrediction = async () => {
    if (!activeModel) return;

    setIsPredicting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/predict/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: activeModel.id,
          features: featureInputs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Simulation failed');
      }

      const data = await res.json();
      setPrediction(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to simulate prediction');
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black stroke-[1.75]" />
            What-If Simulator
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Test custom values & inspect confidence breakdown
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono uppercase text-zinc-400">Model:</label>
          <select
            value={activeModel?.id || ''}
            onChange={(e) => onSelectModel(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-black font-medium"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-zinc-200 text-center text-xs font-mono text-zinc-400">
          No trained models available
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feature Inputs */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Inputs ({modelDetails?.metadata.features.length || 0})
              </h3>
              <button
                onClick={() => activeModel && loadModelDetails(activeModel.id)}
                title="Reset Defaults"
                className="p-2 rounded-lg border border-zinc-200 hover:border-black text-zinc-500 hover:text-black transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            ) : modelDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2">
                {modelDetails.metadata.features.map((feat) => {
                  const isNum = modelDetails.numeric_features.includes(feat);
                  return (
                    <div key={feat} className="space-y-1">
                      <label className="block text-xs font-mono text-zinc-500 truncate">
                        {feat}
                        <span className="text-[10px] text-zinc-400 ml-1">
                          ({isNum ? 'num' : 'cat'})
                        </span>
                      </label>
                      {isNum ? (
                        <input
                          type="number"
                          value={featureInputs[feat] ?? ''}
                          onChange={(e) => handleInputChange(feat, parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-black font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={featureInputs[feat] ?? ''}
                          onChange={(e) => handleInputChange(feat, e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-black font-mono"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={runPrediction}
                disabled={isPredicting || !modelDetails}
                title="Run Simulation"
                className={`p-3.5 px-6 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  isPredicting
                    ? 'bg-zinc-100 text-zinc-400'
                    : 'bg-black text-white hover:bg-zinc-800 shadow-sm'
                }`}
              >
                {isPredicting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                )}
                <span>Simulate</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Real-Time Prediction Output */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-6">
                Inference Result
              </h3>

              {prediction ? (
                <div className="space-y-8">
                  <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/50 text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">
                      {prediction.target_column}
                    </span>
                    <div className="text-4xl font-extrabold text-black font-mono">
                      {prediction.prediction}
                    </div>
                    {prediction.confidence_pct && (
                      <div className="pt-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black text-white font-bold">
                          {prediction.confidence_pct}% Confidence
                        </span>
                      </div>
                    )}
                  </div>

                  {prediction.probability_breakdown &&
                    Object.keys(prediction.probability_breakdown).length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
                          Probability Split
                        </span>
                        {Object.entries(prediction.probability_breakdown).map(([cls, pct]: any) => (
                          <div key={cls} className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Class {cls}:</span>
                              <span className="text-black font-bold">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className="h-full bg-black rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ) : (
                <div className="py-20 text-center text-xs font-mono text-zinc-400 space-y-2">
                  <Cpu className="w-8 h-8 text-zinc-300 mx-auto stroke-[1.5]" />
                  <p>Click "Simulate" to calculate live prediction</p>
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-zinc-400 text-center pt-4 border-t border-zinc-100">
              Ephemeral execution
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
