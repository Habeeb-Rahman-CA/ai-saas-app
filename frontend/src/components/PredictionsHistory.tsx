import React from 'react';
import { History, Download, Calendar, FileSpreadsheet } from 'lucide-react';
import { PredictionSummary } from '../types';

interface PredictionsHistoryProps {
  predictions: PredictionSummary[];
}

export const PredictionsHistory: React.FC<PredictionsHistoryProps> = ({ predictions }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Inference History & Export Archive
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access, view summary metrics, and re-download generated predictions from previous batch scoring jobs.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {predictions.length} Total Jobs
        </span>
      </div>

      {predictions.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center text-xs text-slate-500">
          <FileSpreadsheet className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No predictions generated yet</p>
          <p className="text-xs text-slate-600 mt-1">
            Train a model and run batch CSV inference in Step 3 to view prediction history here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Dataset Filename</th>
                <th className="py-3 px-4">Model Applied</th>
                <th className="py-3 px-4">Target Predicted</th>
                <th className="py-3 px-4">Rows Scored</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {predictions.map((p) => {
                const dateStr = new Date(p.created_at).toLocaleString();
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dateStr}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {p.original_filename}
                    </td>
                    <td className="py-3 px-4 text-indigo-300 font-sans font-medium">
                      {p.model_name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      predicted_{p.target_column}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">
                      {p.row_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/predictions/${p.id}/download`}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-sans text-xs font-medium transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download CSV</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
