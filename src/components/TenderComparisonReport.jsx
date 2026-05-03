import React from 'react';
import html2pdf from 'html2pdf.js';
import { formatNum } from '../utils/calculations';

const TenderComparisonReport = ({ tenders, onBack }) => {
  if (!tenders || tenders.length === 0) return <div className="p-20 text-center">No tenders selected for comparison.</div>;

  // Aggregate metrics for each tender
  const comparisonData = tenders.map(tender => {
    let totalRough = 0;
    let totalPol = 0;
    let totalPolPcs = 0;
    let totalVal = 0;
    let totalBid = 0;

      // Aggregate from all parcels in the tender
    tender.parcels?.forEach(parcel => {
      const state = parcel.calc_state;
      if (!state || !state.table) return;

      totalRough += parseFloat(parcel.total_cts) || 0;
      totalPol += parseFloat(parcel.calc_state?.polCts) || 0;
      totalPolPcs += parseFloat(parcel.calc_state?.polPcs) || 0;
      totalVal += parseFloat(parcel.calc_state?.polVal) || 0;
      totalBid += parseFloat(parcel.calc_state?.finalBid) || 0;
    });

    return {
      id: tender.id,
      name: tender.name,
      date: tender.date,
      roughCts: totalRough,
      polCts: totalPol,
      polPcs: totalPolPcs,
      yield: totalRough > 0 ? (totalPol / totalRough) * 100 : 0,
      polVal: totalVal,
      polPerRough: totalRough > 0 ? totalVal / totalRough : 0,
      finalBid: totalBid
    };
  });

  const handleDownloadPDF = () => {
    const element = document.querySelector('.tender-comparison-report');
    const opt = {
      margin: 0.5,
      filename: `tender_comparison_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="tender-comparison-report">
      <div className="report-header">
        <div className="title-section">
          <h1>TENDER COMPARISON REPORT</h1>
          <p>{tenders.length} Tenders Compared | Generated on {new Date().toLocaleDateString()}</p>
        </div>
        <div className="report-actions">
          <button className="btn btn-outline" onClick={onBack}>
            ← Back to Home
          </button>
          <button className="btn btn-gold" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Overview Metrics Table */}
      <div className="section-title">OVERVIEW — KEY METRICS</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rough Cts</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.roughCts, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Polish Cts</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.polCts, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Polish Pcs</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.polPcs, 0)}</td>
            ))}
          </tr>
          <tr>
            <td>Avg Yield %</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.yield, 1)}%</td>
            ))}
          </tr>
          <tr>
            <td>Polish Value ($)</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.polVal, 0)}</td>
            ))}
          </tr>
          <tr>
            <td>Pol $/Rough Ct</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.polPerRough, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Total Bid ($)</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.finalBid, 0)}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <style jsx>{`
        .tender-comparison-report {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
          background: var(--card);
          color: var(--text);
          border-radius: 16px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          font-family: 'DM Sans', sans-serif;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid var(--blue);
          padding-bottom: 20px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 28px;
          color: var(--blue);
          font-weight: 800;
        }
        .title-section p {
          margin: 5px 0 0 0;
          color: var(--text2);
          opacity: 0.7;
        }
        .report-actions {
          display: flex;
          gap: 10px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 900;
          color: var(--text3);
          margin: 30px 0 15px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          background: var(--card);
        }
        .comparison-table th {
          background: var(--bg2);
          color: var(--text2);
          padding: 12px;
          text-align: left;
          font-weight: 700;
          border: 1px solid var(--border);
          font-size: 11px;
          text-transform: uppercase;
        }
        .comparison-table td {
          padding: 12px;
          border: 1px solid var(--border);
          color: var(--text);
          text-align: center;
        }
        .comparison-table td:first-child {
          font-weight: 600;
          text-align: left;
          color: var(--blue);
          background: var(--bg2);
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .btn-outline:hover { background: var(--bg2); }
        .btn-gold {
          background: var(--amber);
          color: #fff;
        }
        .btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }

        @media print {
          .tender-comparison-report {
             background: #fff !important;
             color: #000 !important;
             padding: 0 !important;
             box-shadow: none !important;
             border: none !important;
          }
          .comparison-table th { background: #f1f5f9 !important; color: #000 !important; }
          .comparison-table td { color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default TenderComparisonReport;