import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Hash, 
  Type, 
  ToggleLeft,
  Calendar,
  Layers
} from 'lucide-react';
import { DatasetProfile, DatasetRecord, SampleDataset } from '../types';

interface DatasetUploadProps {
  datasets: DatasetRecord[];
  samples: SampleDataset[];
  selectedDataset: DatasetRecord | null;
  selectedProfile: DatasetProfile | null;
  onSelectDataset: (record: DatasetRecord) => void;
  onUploadSuccess: (record: DatasetRecord, profile: DatasetProfile) => void;
  onLoadSample: (sampleId: string) => Promise<void>;
  onProceedToTrain: (dataset: DatasetRecord, recommendedTarget?: string) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({
  datasets,
  samples,
  selectedDataset,
  selectedProfile,
  onSelectDataset,
  onUploadSuccess,
  onLoadSample,
  onProceedToTrain,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only .csv files supported');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace('.csv', ''));

    try {
      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }

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

      onUploadSuccess(newRecord, data.profile);
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSampleClick = async (sampleId: string) => {
    setLoadingSample(sampleId);
    setUploadError(null);
    try {
      await onLoadSample(sampleId);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load sample');
    } finally {
      setLoadingSample(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric':
        return <span title="Numeric"><Hash className="w-3.5 h-3.5 text-zinc-600" /></span>;
      case 'categorical':
        return <span title="Categorical"><Type className="w-3.5 h-3.5 text-zinc-600" /></span>;
      case 'boolean':
        return <span title="Boolean"><ToggleLeft className="w-3.5 h-3.5 text-zinc-600" /></span>;
      default:
        return <span title={type}><Calendar className="w-3.5 h-3.5 text-zinc-600" /></span>;
    }
  };

  return (
    <div className="space-y-12">
      {/* Upload Zone & Quick Samples */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Minimalist Dropzone */}
        <div className="lg:col-span-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`h-56 rounded-2xl border border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-8 text-center ${
              isDragging
                ? 'border-black bg-zinc-50 scale-[0.99]'
                : 'border-zinc-300 hover:border-black bg-white hover:bg-zinc-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 stroke-[1.75]" />
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-900 tracking-tight">
              {isUploading ? 'Analyzing CSV...' : 'Drop CSV or click to browse'}
            </p>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Tabular dataset • Auto-cleaning enabled
            </p>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* 1-Click Samples Minimal List */}
        <div className="p-6 rounded-2xl border border-zinc-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>Demo Datasets</span>
            </div>

            <div className="space-y-3">
              {samples.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSampleClick(s.id)}
                  className="p-3.5 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 block group-hover:underline">
                      {s.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                      {s.task_type} • target: {s.target_column}
                    </span>
                  </div>
                  <button
                    type="button"
                    title={`Load ${s.name}`}
                    className="p-2 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors"
                  >
                    {loadingSample === s.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-mono text-zinc-400 pt-4 border-t border-zinc-100">
            Instant benchmarks available
          </p>
        </div>
      </div>

      {/* Dataset Selection & Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Available Datasets */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-black" />
              Datasets ({datasets.length})
            </h3>
          </div>

          {datasets.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-zinc-200 text-center text-xs font-mono text-zinc-400">
              No datasets loaded
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {datasets.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => onSelectDataset(d)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-zinc-400 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate max-w-[150px]">{d.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`text-[10px] font-mono ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {d.row_count.toLocaleString()} rows • {d.col_count} cols
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Dataset Detail Profile */}
        <div className="lg:col-span-3">
          {selectedDataset && selectedProfile ? (
            <div className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-8">
              {/* Header with Icon-Only Train Button */}
              <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-black">{selectedDataset.name}</h2>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    {selectedDataset.original_filename} • {selectedProfile.total_rows.toLocaleString()} rows • {selectedProfile.total_columns} columns
                  </p>
                </div>

                <button
                  onClick={() => {
                    const rec = selectedProfile.columns.find((c) => c.target_recommendation);
                    onProceedToTrain(selectedDataset, rec?.name);
                  }}
                  title="Proceed to Model Training"
                  className="p-3 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm flex items-center gap-2 group"
                >
                  <span className="text-xs font-semibold hidden sm:inline">Train</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              {/* Columns profiling */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
                  Column Schema & Target Inference
                </h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Column</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 font-mono">Unique</th>
                        <th className="py-2.5 px-3">Missing</th>
                        <th className="py-2.5 px-3">Sample Values</th>
                        <th className="py-2.5 px-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                      {selectedProfile.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-black">
                            {col.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1.5 text-zinc-700">
                              {getTypeIcon(col.type)}
                              <span>{col.type}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">
                            {col.unique_count.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">
                            {col.missing_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 truncate max-w-[200px]">
                            {col.sample_values.join(', ') || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {col.target_recommendation ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black text-white font-bold">
                                Target ({col.target_recommendation})
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-sans text-xs">Feature</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
                  Sample Records
                </h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                      <tr>
                        {selectedProfile.columns.map((col) => (
                          <th key={col.name} className="py-2 px-3 whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700">
                      {selectedProfile.preview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/70">
                          {selectedProfile.columns.map((col) => (
                            <td key={col.name} className="py-2 px-3 whitespace-nowrap">
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : <span className="text-zinc-300">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <FileSpreadsheet className="w-10 h-10 text-zinc-300 mb-3 stroke-[1.5]" />
              <p className="text-xs font-mono text-zinc-500">Select or upload a dataset to preview profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
