import { getExportCsvUrl } from '../../services/api';

export default function ExportPanel({ params, hasData }) {
  if (!hasData) return null;

  const csvUrl = getExportCsvUrl({
    lat: params.lat,
    lon: params.lon,
    hazard: params.hazard,
    startYear: params.startYear,
    endYear: params.endYear,
  });

  const handlePrint = () => window.print();

  return (
    <div className="export-panel">
      <a
        id="export-csv-btn"
        href={csvUrl}
        download
        className="btn-export"
        target="_blank"
        rel="noopener noreferrer"
      >
        📥 Export CSV
      </a>
      <button id="export-pdf-btn" className="btn-export" onClick={handlePrint}>
        🖨️ Print / PDF
      </button>
    </div>
  );
}
