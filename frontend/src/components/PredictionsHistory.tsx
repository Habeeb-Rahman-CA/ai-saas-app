import React from 'react';
import { History, Download, Calendar, FileSpreadsheet } from 'lucide-react';
import { PredictionSummary } from '../types';

interface PredictionsHistoryProps {
  predictions: PredictionSummary[];
}

export const PredictionsHistory: React.FC<PredictionsHistoryProps> = ({ predictions }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            <History className="w-5 h-5 text-black stroke-[1.75]" />
            Inference History
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Archived batch runs • Direct CSV exports
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          {predictions.length} Total Runs
        </span>
      </div>

      {predictions.length === 0 ? (
        <div className="p-16 rounded-2xl border border-dashed border-zinc-200 text-center text-xs font-mono text-zinc-400">
          <FileSpreadsheet className="w-10 h-10 text-zinc-300 mx-auto mb-3 stroke-[1.5]" />
          <p className="text-sm font-semibold text-zinc-800">No predictions recorded</p>
          <p className="text-xs text-zinc-400 mt-1">
            Execute batch scoring to build history
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-medium">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Dataset</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Rows</th>
                <th className="py-3 px-4 text-right">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {predictions.map((p) => {
                const dateStr = new Date(p.created_at).toLocaleDateString();
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{dateStr}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-black">
                      {p.original_filename}
                    </td>
                    <td className="py-3 px-4 text-zinc-800">
                      {p.model_name}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      predicted_{p.target_column}
                    </td>
                    <td className="py-3 px-4 text-black font-semibold">
                      {p.row_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/predictions/${p.id}/download`}
                        download
                        title="Download Predictions CSV"
                        className="inline-flex p-2 rounded-lg border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 text-black transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
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
