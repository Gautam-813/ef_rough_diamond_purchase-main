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

      const ranges = state.ranges || [];
      ranges.forEach(r => {
        const target = state.sizeProfile?.[r] || { cts: 0 };
        totalRough += target.cts;

        // Simplified aggregation (can be expanded like TenderSummaryReport)
        // For now, use parcel total_cts
      });

      totalRough += parcel.total_cts || 0;
      totalPol += parcel.calc_state?.polCts || 0;
      totalPolPcs += parcel.calc_state?.polPcs || 0;
      totalVal += parcel.calc_state?.polVal || 0;
      totalBid += parcel.calc_state?.finalBid || 0;
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
          max-width: 1200px;
          margin: 0 auto;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid var(--border, #e2e8f0);
          padding-bottom: 20px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 28px;
          color: var(--text, #1e293b);
        }
        .title-section p {
          margin: 5px 0 0 0;
          color: var(--text2, #64748b);
        }
        .report-actions {
          display: flex;
          gap: 10px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 900;
          color: var(--text, #1e293b);
          margin: 30px 0 15px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          background: var(--bg, #fff);
        }
        .comparison-table th {
          background: var(--card, #1e3a8a);
          color: var(--bg, #fff);
          padding: 12px;
          text-align: left;
          font-weight: 700;
          border: 1px solid var(--border, #e2e8f0);
        }
        .comparison-table td {
          padding: 12px;
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text, #1e293b);
        }
        .comparison-table td:first-child {
          font-weight: 600;
          background: var(--card2, #f8fafc);
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text, #1e293b);
        }
        .btn-gold {
          background: var(--gold, #b45309);
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default TenderComparisonReport;