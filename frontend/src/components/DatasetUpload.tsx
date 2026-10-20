import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Hash, 
  Type, 
  Calendar, 
  ToggleLeft,
  ChevronRight,
  Database
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
      setUploadError('Please select a valid CSV file.');
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
      setUploadError(err.message || 'Failed to load sample dataset');
    } finally {
      setLoadingSample(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'numeric':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
            <Hash className="w-3 h-3" /> Numeric
          </span>
        );
      case 'categorical':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
            <Type className="w-3 h-3" /> Categorical
          </span>
        );
      case 'boolean':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <ToggleLeft className="w-3 h-3" /> Boolean
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 font-mono">
            <Calendar className="w-3 h-3" /> {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload & Demo Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 group ${
              isDragging
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-inner">
                {isUploading ? (
                  <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7 text-indigo-400" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-200">
                  {isUploading ? 'Analyzing and Profiling Dataset...' : 'Drop your training CSV file here'}
                </p>
                <p className="text-xs text-slate-400">
                  or <span className="text-indigo-400 underline font-medium">click to browse</span> from your computer
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>Tabular CSV format</span>
                <span>•</span>
                <span>Auto-cleans missing values</span>
                <span>•</span>
                <span>Instant schema discovery</span>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* 1-Click Demo Datasets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Instant 1-Click Demos</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Don't have a dataset ready? Load one of our ready-to-train datasets instantly:
            </p>

            <div className="space-y-3">
              {samples.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSampleClick(s.id)}
                  className="p-3 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-slate-950/40 hover:bg-slate-800/40 cursor-pointer transition-all duration-200 group flex items-start justify-between"
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                        {s.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-bold ${
                        s.task_type === 'classification'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {s.task_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                  <div className="shrink-0 mt-1">
                    {loadingSample === s.id ? (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Includes pre-matched test sets for batch predictions</span>
          </div>
        </div>
      </div>

      {/* Datasets Library & Active Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Datasets History Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Datasets Library ({datasets.length})
            </h3>
          </div>

          {datasets.length === 0 ? (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
              No datasets loaded yet. Upload a CSV or select a demo sample.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {datasets.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => onSelectDataset(d)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-slate-800/80 bg-slate-900/30 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate max-w-[170px]">{d.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{d.row_count.toLocaleString()} rows</span>
                      <span>•</span>
                      <span>{d.col_count} columns</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Dataset Deep Profile */}
        <div className="lg:col-span-3">
          {selectedDataset && selectedProfile ? (
            <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">{selectedDataset.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Filename: <span className="font-mono text-slate-300">{selectedDataset.original_filename}</span> •{' '}
                    {selectedProfile.total_rows.toLocaleString()} records •{' '}
                    {selectedProfile.total_columns} features profiled
                  </p>
                </div>

                <button
                  onClick={() => {
                    // Pick high recommendation target if exists
                    const rec = selectedProfile.columns.find((c) => c.target_recommendation);
                    onProceedToTrain(selectedDataset, rec?.name);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <span>Train Model with This Dataset</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Column Schema Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Column Profiling & Target Recommendations
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Column Name</th>
                        <th className="py-2.5 px-3">Data Type</th>
                        <th className="py-2.5 px-3">Distinct Values</th>
                        <th className="py-2.5 px-3">Missing</th>
                        <th className="py-2.5 px-3">Sample Values</th>
                        <th className="py-2.5 px-3">AutoML Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                      {selectedProfile.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-200 font-mono">
                            {col.name}
                          </td>
                          <td className="py-2.5 px-3">{getTypeBadge(col.type)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {col.unique_count.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={col.missing_count > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                              {col.missing_pct}% ({col.missing_count})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] truncate max-w-[220px]">
                            {col.sample_values.join(', ') || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {col.target_recommendation ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                                ★ Suggested Target ({col.target_recommendation})
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Feature</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Data Preview (First 10 Rows)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        {selectedProfile.columns.map((col) => (
                          <th key={col.name} className="py-2 px-3 font-mono whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {selectedProfile.preview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 font-mono text-[11px]">
                          {selectedProfile.columns.map((col) => (
                            <td key={col.name} className="py-2 px-3 whitespace-nowrap text-slate-300">
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : <span className="text-slate-600 italic">null</span>}
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
            <div className="h-[460px] rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileSpreadsheet className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400">No Dataset Selected</p>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Upload a CSV above or click one of the demo datasets to view column profiles, statistics, and sample rows.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
