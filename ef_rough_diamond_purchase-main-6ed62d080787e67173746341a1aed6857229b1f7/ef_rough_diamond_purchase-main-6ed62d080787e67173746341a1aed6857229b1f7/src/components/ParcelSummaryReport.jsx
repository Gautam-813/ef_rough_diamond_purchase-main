import React from 'react';
import { formatNum } from '../utils/calculations';
import { COLOUR_LIST, CLARITY_LIST, MASTER_SIZE_CHART } from '../constants/diamondData';

const ParcelSummaryReport = ({ parcel, tender, state, prices, totals }) => {
  if (!state || !state.table || !totals) return <div className="p-20 text-center">No calculation data available for this parcel.</div>;

  // Use the pre-calculated totals from Dashboard.jsx for consistency
  const { 
    totalCts: totalPolCts, 
    totalPcs: totalPolPcs, 
    totalValue: totalPolVal, 
    rangeWise, 
    colorProfile, 
    clarityProfile, 
    usableData 
  } = totals;

  const totalRoughCts = parcel.total_cts;
  
  // 1. Calculate Total Rough Pcs from the size profile table (using cts / avg logic)
  const totalRoughPcs = (state.ranges || []).reduce((sum, r) => {
    const data = state.sizeProfile?.[r] || {};
    const cts = parseFloat(data.cts) || 0;
    const avg = parseFloat(data.avg) || 0;
    return sum + (avg > 0 ? Math.round(cts / avg) : 0);
  }, 0);

  
  // 2. Rough Avg Size = Total Rough CTS / Total PCS
  const roughAvgSize = totalRoughPcs > 0 ? totalRoughCts / totalRoughPcs : 0;
  
  // 3. Total Polish $ is already extracted as totalPolVal above

  
  // 4. Per Ct = Total Polish $ / Rough CTS
  const perCtPol = totalRoughCts > 0 ? totalPolVal / totalRoughCts : 0;
  
  // 5. Labour = from state.labour
  const labourPerRoughCt = parseFloat(state.labour) || 0;
  
  // 6. Rough Cost Per/CT = Per Ct - Labour
  const roughCostPerCt = perCtPol - labourPerRoughCt;
  
  // 7. Profit = Calculated based on profit margin % from the Rough Cost Per/CT
  const profitPct = parseFloat(state.profit_margin) || 0;
  const profitDollars = roughCostPerCt * (profitPct / 100);
  
  // 8. Bid Per CT = Rough Cost Per/CT - Profit
  const bidPerCt = roughCostPerCt - profitDollars;
  
  // 9. Bid Total Amount = Bid Per CT * Rough CTS
  const bidTotalAmount = bidPerCt * totalRoughCts;

  const avgYield = totalRoughCts > 0 ? (totalPolCts / totalRoughCts) * 100 : 0;
  const avgPricePerPolCt = totalPolCts > 0 ? totalPolVal / totalPolCts : 0;


  const ranges = state.ranges || [];

  return (
    <div className="summary-report-container">
      {/* 1. HEADER SUMMARY */}
      <div className="report-header-section">
        <div className="report-title-box">
          <h1 style={{margin:0, fontSize:28, fontWeight:900}}>{parcel.number || 'Lot 80'}</h1>
          <p style={{margin:0, opacity:0.6, fontSize:12}}>{parcel.name} | {tender.name}</p>
        </div>

        <div className="report-header-grid">
          <div className="stat-card">
            <label>Rough Cts</label>
            <div className="val">{formatNum(totalRoughCts, 2)}</div>
          </div>
          <div className="stat-card">
            <label>Rough Pcs</label>
            <div className="val">{formatNum(totalRoughPcs, 0)}</div>
          </div>
          <div className="stat-card">
            <label>Rough Avg Size</label>
            <div className="val">{formatNum(roughAvgSize, 3)}</div>
          </div>
          <div className="stat-card">
            <label>Total Polish $</label>
            <div className="val text-green">${formatNum(totalPolVal, 0)}</div>
          </div>
          <div className="stat-card">
            <label>Per Ct (Pol)</label>
            <div className="val">${formatNum(perCtPol, 2)}</div>
          </div>
          <div className="stat-card">
            <label>Labour</label>
            <div className="val">${formatNum(labourPerRoughCt, 2)}</div>
          </div>
          <div className="stat-card">
            <label>Rough Cost Per/CT</label>
            <div className="val text-gold">${formatNum(roughCostPerCt, 2)}</div>
          </div>
          <div className="stat-card">
            <label>Profit (${profitPct}%)</label>
            <div className="val">${formatNum(profitDollars, 2)}</div>
          </div>
          <div className="stat-card highlight-blue">
            <label>Bid Per CT</label>
            <div className="val">${formatNum(bidPerCt, 2)}</div>
          </div>
          <div className="stat-card highlighted">
            <label>Bid Total Amount</label>
            <div className="val">${formatNum(bidTotalAmount, 0)}</div>
          </div>
        </div>
      </div>


      {/* 2. SIEVE SUMMARY TABLE */}
      <div className="section-title">SIEVE-WISE / POLISH SIZE-WISE SUMMARY</div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Rough Sieve</th>
            <th>Rough Cts</th>
            <th>Pol Pcs</th>
            <th>Pol Cts</th>
            <th>Yield</th>
            <th>Polish Sieve</th>
            <th>Value US$</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map(r => {
            const rData = rangeWise[r] || { pcs: 0, cts: 0, val: 0, roughCts: 0 };
            const sieveInfo = MASTER_SIZE_CHART.find(m => m.sieve.includes(r)) || { sieve: r };
            const rangeYield = rData.roughCts > 0 ? (rData.cts / rData.roughCts) * 100 : 0;
            return (
              <tr key={r}>
                <td style={{fontWeight:700}}>{r}</td>
                <td>{formatNum(rData.roughCts, 2)}</td>
                <td>{formatNum(rData.pcs, 0)}</td>
                <td>{formatNum(rData.cts, 2)}</td>
                <td>{formatNum(rangeYield, 1)}%</td>
                <td style={{fontSize:11, opacity:0.8}}>{sieveInfo.sieve}</td>
                <td className="text-gold">${formatNum(rData.val, 0)}</td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td>TOTAL</td>
            <td>{formatNum(totalRoughCts, 2)}</td>
            <td>{formatNum(totalPolPcs, 0)}</td>
            <td>{formatNum(totalPolCts, 2)}</td>
            <td>{formatNum(avgYield, 1)}%</td>
            <td>-</td>
            <td className="text-gold">${formatNum(totalPolVal, 0)}</td>
          </tr>
        </tbody>
      </table>

      {/* 3. COLOUR & CLARITY PROFILES */}
      <div className="grid-2-col" style={{marginTop:30}}>
        <div>
          <div className="section-title">COLOUR PROFILE (POL CTS)</div>
          <table className="summary-table mini">
            <thead>
              <tr><th>Colour</th><th>Pol Cts</th><th>%</th></tr>
            </thead>
            <tbody>
              {COLOUR_LIST.map(col => (
                <tr key={col}>
                  <td>{col}</td>
                  <td>{formatNum(colorProfile[col], 2)}</td>
                  <td>{totalPolCts > 0 ? ((colorProfile[col] / totalPolCts) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{formatNum(totalPolCts, 2)}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="section-title">CLARITY PROFILE (POL CTS)</div>
          <table className="summary-table mini">
            <thead>
              <tr><th>Clarity</th><th>Pol Cts</th><th>%</th></tr>
            </thead>
            <tbody>
              {CLARITY_LIST.map(clr => (
                <tr key={clr}>
                  <td>{clr}</td>
                  <td>{formatNum(clarityProfile[clr], 2)}</td>
                  <td>{totalPolCts > 0 ? ((clarityProfile[clr] / totalPolCts) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{formatNum(totalPolCts, 2)}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. USABLE vs NON-USABLE */}
      <div className="section-title" style={{marginTop:30}}>USABLE vs NON-USABLE</div>
      <div className="info-banner">
        <b>Usable:</b> D–H colour / VVS or VS1 clarity. <b>Non-Usable:</b> I-JK colour or VS2 / SI1 / SI2 and below.
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Rough Cts</th>
            <th>Pol Cts</th>
            <th>Pol Value</th>
            <th>Pol $/ct (rough)</th>
            <th>% Pol Cts</th>
            <th>% Pol Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{fontWeight:700}}>Usable (D–H / VVS & VS1)</td>
            <td>{formatNum(usableData.usableRough, 2)}</td>
            <td>{formatNum(usableData.usablePol, 2)}</td>
            <td>${formatNum(usableData.usableVal, 0)}</td>
            <td>${usableData.usableRough > 0 ? (usableData.usableVal / usableData.usableRough).toFixed(2) : 0}</td>
            <td>{totalPolCts > 0 ? ((usableData.usablePol / totalPolCts) * 100).toFixed(1) : 0}%</td>
            <td>{totalPolVal > 0 ? ((usableData.usableVal / totalPolVal) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td style={{fontWeight:700}}>Non-Usable (I-JK / VS2 & below)</td>
            <td>{formatNum(usableData.nonUsableRough, 2)}</td>
            <td>{formatNum(usableData.nonUsablePol, 2)}</td>
            <td>${formatNum(usableData.nonUsableVal, 0)}</td>
            <td>${usableData.nonUsableRough > 0 ? (usableData.nonUsableVal / usableData.nonUsableRough).toFixed(2) : 0}</td>
            <td>{totalPolCts > 0 ? ((usableData.nonUsablePol / totalPolCts) * 100).toFixed(1) : 0}%</td>
            <td>{totalPolVal > 0 ? ((usableData.nonUsableVal / totalPolVal) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr className="total-row">
            <td>TOTAL</td>
            <td>{formatNum(totalRoughCts, 2)}</td>
            <td>{formatNum(totalPolCts, 2)}</td>
            <td>${formatNum(totalPolVal, 0)}</td>
            <td>${totalRoughCts > 0 ? (totalPolVal / totalRoughCts).toFixed(2) : 0}</td>
            <td>100.0%</td>
            <td>100.0%</td>
          </tr>
        </tbody>
      </table>

      <div style={{display: 'flex', gap: 20, marginTop: 30}}>
        {/* 4.5. USABLE DETAIL */}
        <div style={{flex: 1}}>
          <div className="section-title">USABLE DETAIL (PCS)</div>
          <table className="summary-table mini" style={{maxWidth: 300}}>
            <thead>
              <tr><th>Color</th><th>VVS</th><th>VS1</th><th>Total</th><th>%</th></tr>
            </thead>
            <tbody>
              {(() => {
                const { usablePcs } = usableData;
                const totalUsable = Object.values(usablePcs).reduce((s, c) => s + (c.VVS || 0) + (c.VS1 || 0), 0);
                return Object.keys(usablePcs).map(col => {
                  const rowTotal = (usablePcs[col].VVS || 0) + (usablePcs[col].VS1 || 0);
                  const pct = totalUsable > 0 ? ((rowTotal / totalUsable) * 100).toFixed(1) : 0;
                  return (
                    <tr key={col}>
                      <td>{col}</td>
                      <td>{usablePcs[col].VVS || 0}</td>
                      <td>{usablePcs[col].VS1 || 0}</td>
                      <td>{rowTotal}</td>
                      <td>{pct}%</td>
                    </tr>
                  );
                }).concat(
                  <tr className="total-row" key="total">
                    <td>TOTAL</td>
                    <td>{Object.values(usablePcs).reduce((s, c) => s + (c.VVS || 0), 0)}</td>
                    <td>{Object.values(usablePcs).reduce((s, c) => s + (c.VS1 || 0), 0)}</td>
                    <td>{Object.values(usablePcs).reduce((s, c) => s + (c.VVS || 0) + (c.VS1 || 0), 0)}</td>
                    <td>100.0%</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* 4.6. NON-USABLE DETAIL */}
        <div style={{flex: 1}}>
          <div className="section-title">NON-USABLE DETAIL (PCS)</div>
          <table className="summary-table mini" style={{maxWidth: 400}}>
            <thead>
              <tr><th>Color</th><th>VS2</th><th>SI1</th><th>SI2</th><th>I1</th><th>I2</th><th>Total</th><th>%</th></tr>
            </thead>
            <tbody>
              {(() => {
                const { nonUsablePcs } = usableData;
                const totalNonUsable = Object.values(nonUsablePcs).reduce((s, c) => s + Object.values(c).reduce((t, v) => t + v, 0), 0);
                return Object.keys(nonUsablePcs).map(col => {
                  const rowTotal = Object.values(nonUsablePcs[col]).reduce((s, v) => s + v, 0);
                  const pct = totalNonUsable > 0 ? ((rowTotal / totalNonUsable) * 100).toFixed(1) : 0;
                  return (
                    <tr key={col}>
                      <td>{col}</td>
                      <td>{nonUsablePcs[col].VS2 || 0}</td>
                      <td>{nonUsablePcs[col].SI1 || 0}</td>
                      <td>{nonUsablePcs[col].SI2 || 0}</td>
                      <td>{nonUsablePcs[col].I1 || 0}</td>
                      <td>{nonUsablePcs[col].I2 || 0}</td>
                      <td>{rowTotal}</td>
                      <td>{pct}%</td>
                    </tr>
                  );
                }).concat(
                  <tr className="total-row" key="total">
                    <td>TOTAL</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + (c.VS2 || 0), 0)}</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + (c.SI1 || 0), 0)}</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + (c.SI2 || 0), 0)}</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + (c.I1 || 0), 0)}</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + (c.I2 || 0), 0)}</td>
                    <td>{Object.values(nonUsablePcs).reduce((s, c) => s + Object.values(c).reduce((t, v) => t + v, 0), 0)}</td>
                    <td>100.0%</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BID SUMMARY */}
      <div className="section-title" style={{marginTop:30}}>VALUATION BREAKDOWN</div>
      <div className="bid-summary-grid">
         <div className="bid-item"><span>Total Polish Value</span><b>${formatNum(totalPolVal, 2)}</b></div>
         <div className="bid-item"><span>Labour / Rough Ct</span><b>${formatNum(labourPerRoughCt, 2)}</b></div>
         <div className="bid-item"><span>Rough Cost Per/CT (Pre-Profit)</span><b>${formatNum(roughCostPerCt, 2)}</b></div>
         <div className="bid-item"><span>Profit Margin ({profitPct}%)</span><b>${formatNum(profitDollars, 2)}</b></div>
         <div className="bid-item highlight"><span>Final Bid Per CT</span><b>${formatNum(bidPerCt, 2)}</b></div>
         <div className="bid-item highlight"><span>Total Bid Amount</span><b>${formatNum(bidTotalAmount, 0)}</b></div>
      </div>

      {/* 6. FLUORESCENCE PROFILE */}
      <div className="section-title" style={{marginTop:30}}>FLUORESCENCE PROFILE (ROUGH CTS BASIS)</div>
      <table className="summary-table mini" style={{maxWidth:500}}>
         <thead><tr><th>Fluorescence</th><th>Rough Cts</th><th>% of Parcel</th></tr></thead>
         <tbody>
            {Object.entries(state.fluo || { "None": 100, "Fnt": 0, "Med/Stg": 0 }).map(([cat, pct]) => {
               const cts = totalRoughCts * (parseFloat(pct) || 0) / 100;
               return (
                  <tr key={cat}>
                     <td>{cat}</td>
                     <td>{formatNum(cts, 2)}</td>
                     <td>{formatNum(parseFloat(pct) || 0, 1)}%</td>
                  </tr>
               );
            })}
            <tr className="total-row">
               <td>TOTAL</td>
               <td>{formatNum(totalRoughCts, 2)}</td>
               <td>100.0%</td>
            </tr>
         </tbody>
      </table>
      <style jsx>{`
        .summary-report-container {
          background: var(--card);
          color: var(--text);
          padding: 40px;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: var(--shadow);
          max-width: 1200px;
          margin: 20px auto;
          border: 1px solid var(--border);
        }
        .report-header-section {
          margin-bottom: 30px;
          border-bottom: 2px solid var(--blue);
          padding-bottom: 20px;
        }
        .report-title-box {
          margin-bottom: 20px;
        }
        .report-header-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .stat-card {
          text-align: center;
          padding: 10px;
          background: var(--bg2);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .stat-card label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.6;
          margin-bottom: 5px;
          color: var(--text3);
        }
        .stat-card .val {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
        }
        .stat-card.highlight-blue {
          background: rgba(59, 130, 246, 0.1);
          border-color: var(--blue);
        }
        .stat-card.highlighted {
          background: var(--blue);
          border-color: var(--blue);
        }
        .stat-card.highlighted .val, .stat-card.highlighted label {
          color: #fff;
          opacity: 1;
          font-weight: 800;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--text3);
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .summary-table th {
          background: var(--bg2);
          color: var(--text2);
          text-align: left;
          padding: 10px;
          font-size: 11px;
          text-transform: uppercase;
          border: 1px solid var(--border);
        }
        .summary-table td {
          padding: 10px;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          color: var(--text);
        }
        .summary-table td:first-child { border-left: 1px solid var(--border); }
        .summary-table.mini {
          font-size: 12px;
        }
        .summary-table.mini th,
        .summary-table.mini td {
          text-align: center;
        }
        .total-row {
          background: var(--bg2);
          font-weight: 800;
        }
        .text-gold { color: var(--amber) !important; }
        .text-green { color: var(--green) !important; }
        .grid-2-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .info-banner {
          background: var(--bg2);
          border: 1px solid var(--border);
          padding: 10px 15px;
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 15px;
          color: var(--text2);
        }
        .bid-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border: 1px solid var(--border);
        }
        .bid-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          font-size: 14px;
          color: var(--text);
        }
        .bid-item.highlight {
          background: var(--bg2);
        }
        .bid-item span { color: var(--text2); }
        .bid-item b { font-weight: 800; color: var(--text); }

        @media print {
          .summary-report-container {
             background: #fff !important;
             color: #000 !important;
             padding: 0 !important;
             box-shadow: none !important;
             border: none !important;
          }
          .summary-table th { background: #f1f5f9 !important; color: #000 !important; }
          .summary-table td { color: #000 !important; }
          .stat-card { background: #f8fafc !important; color: #000 !important; }
          .stat-card.highlighted { background: #1e3a8a !important; color: #fff !important; }
        }
      `}</style>
    </div>
  );
};

export default ParcelSummaryReport;
