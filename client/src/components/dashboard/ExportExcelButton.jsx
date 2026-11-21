import React, { useState } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export default function ExportExcelButton({ challengeId, challengeTitle }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!challengeId) return;
    setIsExporting(true);
    try {
      await analyticsApi.downloadExcelReport(challengeId, challengeTitle);
    } catch (err) {
      alert('Failed to generate Excel report. Please ensure results exist.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 disabled:opacity-50 transition"
      title="Download complete candidate performance workbook in .xlsx format"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      <span>{isExporting ? 'Generating Report...' : 'Export to Excel (.xlsx)'}</span>
    </button>
  );
}

