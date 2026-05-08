import React from 'react';
import { formatNum } from '../utils/calculations';
import { getPriceIdxFromRange } from '../utils/priceUtils';
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
  let grandTotalRoughPcs = 0;
  let grandTotalPol = 0;
  let grandTotalVal = 0;
  let grandTotalBid = 0;

  const parcelSummaries = parcels.map(p => {
    const state = p.calc_state;
    if (!state || !state.table) {
      return { name: p.name, number: p.number, rough: p.total_cts, pol: 0, val: 0, bid: 0 };
    }

    let pRough = 0;
    let pPol = 0;
    let pVal = 0;

    const ranges = state.ranges || [];
    ranges.forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0 };
      const rangeCfg = state.rangeConfig?.[r] || { yield: 44, roundYieldByClarity: {}, fancyYieldByClarity: {} };
      const defaultYield = parseFloat(rangeCfg.yield) || 44;
      const roundYieldByClarity = rangeCfg.roundYieldByClarity || {};
      const fancyYieldByClarity = rangeCfg.fancyYieldByClarity || {};

      pRough += parseFloat(target.cts) || 0;

        // Calculate sample rough cts to find scale factor
        let sampleRough = 0;
        for (const col of COLOUR_LIST) {
          const colData = state.table && state.table[r] && state.table[r][col] ? state.table[r][col] : {};
          for (const shape of Object.keys(colData)) {
            for (const clr of CLARITY_LIST) {
              sampleRough += parseFloat(colData[shape]?.[clr]?.cts) || 0;
            }
          }
        }

      const scaleFactor = (target.cts > 0 && sampleRough > 0) ? (target.cts / sampleRough) : 1;

        for (const col of COLOUR_LIST) {
          const colData = state.table && state.table[r] && state.table[r][col] ? state.table[r][col] : {};
          for (const shape of Object.keys(colData)) {
            const isRound = shape === "Round";
            for (const clr of CLARITY_LIST) {
              const sC = parseFloat(colData[shape]?.[clr]?.cts) || 0;
              const yieldPct = isRound 
                ? (parseFloat(roundYieldByClarity[clr]) || defaultYield)
                : (parseFloat(fancyYieldByClarity[clr]) || defaultYield);
              const polC = (sC * scaleFactor) * (yieldPct / 100);
              const priceIdx = getPriceIdxFromRange(r);
              const priceShape = shape === "Round" ? "Round" : "Fancy";
              const price = prices?.[priceShape]?.[priceIdx]?.[col]?.[clr] || 0;

              pPol += polC;
              pVal += (polC * price);
            }
          }
        }
    });
    
    // Fallback: If no rough cts entered in size profile, use the parcel total_cts
    if (pRough <= 0 && p.total_cts > 0) {
      pRough = p.total_cts;
    }

    const labour = parseFloat(state.labour) || 0;

    // Per Ct Pol $ = Polish Value ÷ Rough Cts
    const perCtPol = pVal / pRough;

    // FINAL BID VALUE = Per Ct Pol $ - Labour ($/ct)
    const bid = (perCtPol - labour) * pRough;

    let pRoughPcs = 0;
    ranges.forEach(r => {
      const data = state.sizeProfile?.[r] || {};
      const cts = parseFloat(data.cts) || 0;
      const avg = parseFloat(data.avg) || 0;
      pRoughPcs += avg > 0 ? Math.round(cts / avg) : 0;
    });
    if (pRoughPcs <= 0 && p.pcs > 0) pRoughPcs = p.pcs;

    grandTotalRough += pRough;
    grandTotalRoughPcs += pRoughPcs;
    grandTotalPol += pPol;
    grandTotalVal += pVal;
    grandTotalBid += bid;

    return {
      id: p.id,
      name: p.name,
      number: p.number,
      rough: p.total_cts,
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
            <div className="val">{formatNum(grandTotalRough, 2)} cts / {formatNum(grandTotalRoughPcs, 0)} pcs</div>
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
          background: var(--card);
          color: var(--text);
          padding: 50px;
          border-radius: 16px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: var(--shadow);
          max-width: 1200px;
          margin: 30px auto;
          border: 1px solid var(--border);
        }
        .tender-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid var(--blue);
          padding-bottom: 20px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 32px;
          color: var(--blue);
          font-weight: 800;
        }
        .title-section p {
          margin: 5px 0 0 0;
          opacity: 0.6;
          font-weight: 700;
          fontSize: 14px;
          color: var(--text2);
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
          color: var(--text3);
        }
        .grand-stat .val {
          font-size: 20px;
          font-weight: 900;
          color: var(--text);
        }
        .grand-stat.highlight .val {
          color: var(--green);
          font-size: 28px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 900;
          color: var(--text3);
          margin-bottom: 20px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .tender-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          background: var(--card);
        }
        .tender-table th {
          background: var(--bg2);
          color: var(--text2);
          text-align: left;
          padding: 15px;
          border: 1px solid var(--border);
          font-size: 12px;
          text-transform: uppercase;
        }
        .tender-table td {
          padding: 15px;
          border: 1px solid var(--border);
          font-size: 14px;
          color: var(--text);
        }
        .total-row {
          background: var(--bg2);
          font-weight: 900;
        }
        .text-gold { color: var(--amber) !important; }
        .text-green { color: var(--green) !important; }
        .tender-footer {
          text-align: center;
          font-size: 11px;
          opacity: 0.5;
          border-top: 1px solid var(--border);
          padding-top: 20px;
          color: var(--text3);
        }

        @media print {
          .tender-summary-container {
             background: #fff !important;
             color: #000 !important;
             padding: 0 !important;
             box-shadow: none !important;
             border: none !important;
          }
          .tender-table th { background: #f1f5f9 !important; color: #000 !important; }
          .tender-table td { color: #000 !important; }
          .title-section h1 { color: #1e3a8a !important; }
        }
      `}</style>

    </div>
  );
};

export default TenderSummaryReport;
