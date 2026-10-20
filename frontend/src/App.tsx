import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DatasetUpload } from './components/DatasetUpload';
import { ModelTrainer } from './components/ModelTrainer';
import { BatchPredictor } from './components/BatchPredictor';
import { SinglePredictor } from './components/SinglePredictor';
import { PredictionsHistory } from './components/PredictionsHistory';
import { 
  DatasetRecord, 
  DatasetProfile, 
  ModelSummary, 
  ModelDetails, 
  SampleDataset, 
  PredictionSummary,
  BatchPredictionResult
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'datasets' | 'train' | 'batch_predict' | 'single_predict' | 'history'>('datasets');
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetRecord | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DatasetProfile | null>(null);
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelDetails, setSelectedModelDetails] = useState<ModelDetails | null>(null);
  const [trainingTargetHint, setTrainingTargetHint] = useState<string | undefined>(undefined);

  const [predictions, setPredictions] = useState<PredictionSummary[]>([]);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [dsRes, mRes, pRes, sRes] = await Promise.all([
          fetch('/api/datasets'),
          fetch('/api/models'),
          fetch('/api/predictions'),
          fetch('/api/samples'),
        ]);

        if (dsRes.ok) {
          const dsData = await dsRes.json();
          setDatasets(dsData);
          if (dsData.length > 0) {
            handleSelectDataset(dsData[0]);
          }
        }

        if (mRes.ok) {
          const mData = await mRes.json();
          setModels(mData);
          if (mData.length > 0) {
            handleSelectModel(mData[0].id);
          }
        }

        if (pRes.ok) {
          const pData = await pRes.json();
          setPredictions(pData);
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          setSamples(sData);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }

    loadInitialData();
  }, []);

  const handleSelectDataset = async (record: DatasetRecord) => {
    setSelectedDataset(record);
    try {
      const res = await fetch(`/api/datasets/${record.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProfile(data.profile);
      }
    } catch (err) {
      console.error('Failed to fetch dataset details:', err);
    }
  };

  const handleUploadSuccess = (record: DatasetRecord, profile: DatasetProfile) => {
    setDatasets((prev) => [record, ...prev]);
    setSelectedDataset(record);
    setSelectedProfile(profile);
  };

  const handleLoadSample = async (sampleId: string) => {
    const res = await fetch(`/api/samples/load/${sampleId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to load sample');
    const data = await res.json();
    const newRecord: DatasetRecord = {
      id: data.dataset_id,
      name: data.name,
      original_filename: data.filename,
      row_count: data.profile.total_rows,
      col_count: data.profile.total_columns,
      file_path: '',
      created_at: new Date().toISOString(),
    };
    setDatasets((prev) => [newRecord, ...prev]);
    setSelectedDataset(newRecord);
    setSelectedProfile(data.profile);
  };

  const handleProceedToTrain = (dataset: DatasetRecord, recommendedTarget?: string) => {
    setSelectedDataset(dataset);
    setTrainingTargetHint(recommendedTarget);
    setActiveTab('train');
  };

  const handleSelectModel = async (modelId: string) => {
    setSelectedModelId(modelId);
    try {
      const res = await fetch(`/api/models/${modelId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedModelDetails(data);
      }
    } catch (err) {
      console.error('Failed to load model details:', err);
    }
  };

  const handleModelTrained = (summary: ModelSummary, details: ModelDetails) => {
    setModels((prev) => [summary, ...prev]);
    setSelectedModelId(summary.id);
    setSelectedModelDetails(details);
  };

  const handlePredictionComplete = (_result: BatchPredictionResult) => {
    fetch('/api/predictions')
      .then((r) => r.json())
      .then((data) => setPredictions(data))
      .catch(console.error);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-zinc-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasetCount={datasets.length}
        modelCount={models.length}
        predictionCount={predictions.length}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        {/* Minimalist Tab Content */}
        {activeTab === 'datasets' && (
          <DatasetUpload
            datasets={datasets}
            samples={samples}
            selectedDataset={selectedDataset}
            selectedProfile={selectedProfile}
            onSelectDataset={handleSelectDataset}
            onUploadSuccess={handleUploadSuccess}
            onLoadSample={handleLoadSample}
            onProceedToTrain={handleProceedToTrain}
          />
        )}

        {activeTab === 'train' && (
          <ModelTrainer
            datasets={datasets}
            selectedDataset={selectedDataset}
            datasetProfile={selectedProfile}
            models={models}
            selectedModel={selectedModelDetails}
            initialTarget={trainingTargetHint}
            onSelectDataset={handleSelectDataset}
            onSelectModel={handleSelectModel}
            onModelTrained={handleModelTrained}
            onProceedToPredict={(mId) => {
              setSelectedModelId(mId);
              setActiveTab('batch_predict');
            }}
            onProceedToSimulator={(mId) => {
              setSelectedModelId(mId);
              setActiveTab('single_predict');
            }}
          />
        )}

        {activeTab === 'batch_predict' && (
          <BatchPredictor
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={handleSelectModel}
            onPredictionComplete={handlePredictionComplete}
          />
        )}

        {activeTab === 'single_predict' && (
          <SinglePredictor
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={handleSelectModel}
          />
        )}

        {activeTab === 'history' && (
          <PredictionsHistory predictions={predictions} />
        )}
      </main>

      {/* Minimalist Clean Footer with ample blank space */}
      <footer className="border-t border-zinc-200/80 bg-white py-12 mt-20 text-xs font-mono text-zinc-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            <span className="text-zinc-600 font-medium">PREDICTR AUTOMATION ENGINE</span>
          </div>
          <div className="flex items-center gap-6">
            <span>FASTAPI</span>
            <span>•</span>
            <span>SCIKIT-LEARN</span>
            <span>•</span>
            <span>REACT 19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
