import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
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

      // Pre-initialize feature inputs
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
        throw new Error(err.detail || 'Prediction failed');
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
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Interactive "What-If" Scenario Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Test custom parameter inputs in real-time to observe model predictions and confidence probabilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Model:</label>
          <select
            value={activeModel?.id || ''}
            onChange={(e) => onSelectModel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
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
        <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center text-xs text-slate-500">
          No trained models available. Train a model in Step 2 to use the simulator.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature Inputs Form */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Simulated Feature Inputs ({modelDetails?.metadata.features.length || 0})
              </h3>
              <button
                onClick={() => activeModel && loadModelDetails(activeModel.id)}
                className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : modelDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2">
                {modelDetails.metadata.features.map((feat) => {
                  const isNum = modelDetails.numeric_features.includes(feat);
                  return (
                    <div key={feat} className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300 font-mono truncate">
                        {feat}
                        <span className="text-[10px] text-slate-500 ml-1.5 font-sans">
                          ({isNum ? 'Numeric' : 'Categorical'})
                        </span>
                      </label>
                      {isNum ? (
                        <input
                          type="number"
                          value={featureInputs[feat] ?? ''}
                          onChange={(e) => handleInputChange(feat, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={featureInputs[feat] ?? ''}
                          onChange={(e) => handleInputChange(feat, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="pt-2">
              <button
                onClick={runPrediction}
                disabled={isPredicting || !modelDetails}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  isPredicting
                    ? 'bg-slate-800 text-slate-500'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-500/20'
                }`}
              >
                {isPredicting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Simulate Prediction</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Real-Time Prediction Output Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Real-Time Inference Output
              </h3>

              {prediction ? (
                <div className="space-y-6">
                  {/* Big Prediction Value */}
                  <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-medium">
                      Predicted {prediction.target_column}
                    </span>
                    <div className="text-3xl font-extrabold text-indigo-300 font-mono">
                      {prediction.prediction}
                    </div>
                    {prediction.confidence_pct && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          {prediction.confidence_pct}% Confidence
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Probabilities Breakdown (if classification) */}
                  {prediction.probability_breakdown &&
                    Object.keys(prediction.probability_breakdown).length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-semibold text-slate-300 block">
                          Class Probabilities
                        </span>
                        {Object.entries(prediction.probability_breakdown).map(([cls, pct]: any) => (
                          <div key={cls} className="space-y-1 text-xs">
                            <div className="flex justify-between font-mono">
                              <span className="text-slate-400">Class {cls}:</span>
                              <span className="text-indigo-300 font-semibold">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <Cpu className="w-8 h-8 text-slate-700 mx-auto" />
                  <p>Modify feature values and click "Simulate Prediction" to generate real-time inferences.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              Runs in-memory without affecting stored datasets.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
