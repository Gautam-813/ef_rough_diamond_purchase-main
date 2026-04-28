import React from 'react';
import { formatNum } from '../utils/calculations';
import { COLOUR_LIST, CLARITY_LIST, SIEVE_RANGES } from '../constants/diamondData';

const TenderSummaryReport = ({ tender, parcels, prices }) => {
  if (!parcels || parcels.length === 0) return <div className="p-20 text-center">No parcels in this notebook to summarize.</div>;

  const handleDownloadPDF = () => {
    const element = document.querySelector('.tender-summary-container');
    const opt = {
      margin: 0.5,
      filename: `tender_summary_${tender.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    import('html2pdf.js').then(html2pdf => {
      html2pdf.default().set(opt).from(element).save();
    });
  };

  // --- CALCULATION LOGIC (Aggregated) ---
  let grandTotalRough = 0;
  let grandTotalPol = 0;
  let grandTotalVal = 0;
  let grandTotalBid = 0;

  const parcelSummaries = parcels.map(p => {
    const state = p.calc_state;
    if (!state || !state.table) return { name: p.name, number: p.number, rough: p.total_cts, pol: 0, val: 0, bid: 0 };

    let pRough = 0;
    let pPol = 0;
    let pVal = 0;

    const ranges = state.ranges || [];
    ranges.forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0 };
      const rangeCfg = state.rangeConfig?.[r] || { yield: 44 };
      const yieldPct = parseFloat(rangeCfg.yield) || 44;
      
      pRough += target.cts;

      // Calculate sample rough cts to find scale factor
      let sampleRough = 0;
      COLOUR_LIST.forEach(col => {
        Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
          CLARITY_LIST.forEach(clr => {
            sampleRough += parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
          });
        });
      });

      const scaleFactor = (target.cts > 0 && sampleRough > 0) ? (target.cts / sampleRough) : 1;

      COLOUR_LIST.forEach(col => {
        Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
          CLARITY_LIST.forEach(clr => {
            const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
            const polC = (sC * scaleFactor) * (yieldPct / 100);
            const priceIdx = SIEVE_RANGES[r]?.priceIdx || "s1";
            const price = prices?.[shape]?.[priceIdx]?.[col]?.[clr] || 0;
            
            pPol += polC;
            pVal += (polC * price);
          });
        });
      });
    });

    const labour = parseFloat(state.labour) || 0;
    const profit = parseFloat(state.profit_margin) || 0;
    const bid = (pVal / pRough - labour) * (1 - profit / 100) * pRough;

    grandTotalRough += pRough;
    grandTotalPol += pPol;
    grandTotalVal += pVal;
    grandTotalBid += bid;

    return {
      id: p.id,
      name: p.name,
      number: p.number,
      rough: pRough,
      pol: pPol,
      yield: pRough > 0 ? (pPol / pRough) * 100 : 0,
      val: pVal,
      avgPolPrice: pPol > 0 ? pVal / pPol : 0,
      bid: bid
    };
  });

  return (
    <div className="tender-summary-container">
      <div className="tender-header">
        <div className="title-section">
          <h1 style={{margin:0, fontSize:32, color:'#1e3a8a'}}>TENDER SUMMARY REPORT</h1>
          <p style={{margin:0, opacity:0.6, fontWeight:700, fontSize:14}}>{tender.name.toUpperCase()} | VIEWING DATE: {tender.viewing_date || 'N/A'}</p>
        </div>
        <div className="grand-stats">
          <div className="grand-stat">
            <label>Total Rough</label>
            <div className="val">{formatNum(grandTotalRough, 2)} cts</div>
          </div>
          <div className="grand-stat">
            <label>Total Polish</label>
            <div className="val">{formatNum(grandTotalPol, 2)} cts</div>
          </div>
          <div className="grand-stat highlight">
            <label>Total Bid Value</label>
            <div className="val">${formatNum(grandTotalBid, 0)}</div>
          </div>
        </div>
      </div>

      <div className="section-title">PARCEL-BY-PARCEL ANALYSIS</div>
      <table className="tender-table">
        <thead>
          <tr>
            <th>Lot No.</th>
            <th>Description</th>
            <th>Rough Cts</th>
            <th>Pol Cts</th>
            <th>Yield</th>
            <th>Avg Pol $/ct</th>
            <th>Pol Value</th>
            <th>Final Bid</th>
          </tr>
        </thead>
        <tbody>
          {parcelSummaries.map(ps => (
            <tr key={ps.id}>
              <td style={{fontWeight:800}}>{ps.number}</td>
              <td>{ps.name}</td>
              <td>{formatNum(ps.rough, 2)}</td>
              <td>{formatNum(ps.pol, 2)}</td>
              <td>{formatNum(ps.yield, 1)}%</td>
              <td>${formatNum(ps.avgPolPrice, 0)}</td>
              <td className="text-gold">${formatNum(ps.val, 0)}</td>
              <td className="text-green" style={{fontWeight:800}}>${formatNum(ps.bid, 0)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={2}>GRAND TOTAL</td>
            <td>{formatNum(grandTotalRough, 2)}</td>
            <td>{formatNum(grandTotalPol, 2)}</td>
            <td>{grandTotalRough > 0 ? ((grandTotalPol / grandTotalRough) * 100).toFixed(1) : 0}%</td>
            <td>${grandTotalPol > 0 ? (grandTotalVal / grandTotalPol).toFixed(0) : 0}</td>
            <td className="text-gold">${formatNum(grandTotalVal, 0)}</td>
            <td className="text-green" style={{fontSize:18}}>${formatNum(grandTotalBid, 0)}</td>
          </tr>
        </tbody>
      </table>

      <div className="tender-footer">
        <p>Report Generated on {new Date().toLocaleDateString()} | EF Diamond ERP System</p>
      </div>

      <style jsx>{`
        .tender-summary-container {
          background: #fff;
          color: #1e293b;
          padding: 50px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 20px 50px rgba(0,0,0,0.1);
          max-width: 1100px;
          margin: 30px auto;
        }
        .tender-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #1e3a8a;
          padding-bottom: 20px;
        }
        .grand-stats {
          display: flex;
          gap: 30px;
        }
        .grand-stat {
          text-align: right;
        }
        .grand-stat label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.6;
        }
        .grand-stat .val {
          font-size: 20px;
          font-weight: 900;
        }
        .grand-stat.highlight .val {
          color: #15803d;
          font-size: 28px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 900;
          color: #64748b;
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
        .tender-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        .tender-table th {
          background: #f8fafc;
          color: #475569;
          text-align: left;
          padding: 15px;
          border-bottom: 2px solid #e2e8f0;
          font-size: 12px;
          text-transform: uppercase;
        }
        .tender-table td {
          padding: 15px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .total-row {
          background: #1e3a8a;
          color: #fff;
          font-weight: 900;
        }
        .total-row td {
          border: none;
        }
        .text-gold { color: #b45309; }
        .text-green { color: #15803d; }
        .tender-footer {
          text-align: center;
          font-size: 11px;
          opacity: 0.5;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }
      `}</style>
    </div>
  );
};

export default TenderSummaryReport;
