import React from 'react';
import { formatNum } from '../utils/calculations';
import { COLOUR_LIST, CLARITY_LIST, SIEVE_RANGES, MASTER_SIZE_CHART } from '../constants/diamondData';

const ParcelSummaryReport = ({ parcel, tender, state, prices }) => {
  if (!state || !state.table) return <div className="p-20 text-center">No calculation data available for this parcel.</div>;

  // --- MATH HELPERS ---
  const getRoughCtsByRange = (range) => {
    let total = 0;
    COLOUR_LIST.forEach(col => {
      Object.keys(state.table?.[range]?.[col] || {}).forEach(shape => {
        CLARITY_LIST.forEach(clr => {
          total += parseFloat(state.table?.[range]?.[col]?.[shape]?.[clr]?.cts) || 0;
        });
      });
    });
    return total;
  };

  const getPolishedDataByRange = (range) => {
    let pcs = 0; let cts = 0; let val = 0;
    const rangeCfg = state.rangeConfig?.[range] || { yield: 44, multiplier: 1 };
    const yieldPct = parseFloat(rangeCfg.yield) || 44;
    const multiplier = parseFloat(rangeCfg.multiplier) || 1;
    
    // Scale factor for this range
    const target = state.sizeProfile?.[range] || { cts: 0 };
    const sampleRoughCts = getRoughCtsByRange(range);
    const scaleFactor = (target.cts > 0 && sampleRoughCts > 0) ? (target.cts / sampleRoughCts) : 1;

    COLOUR_LIST.forEach(col => {
      Object.keys(state.table?.[range]?.[col] || {}).forEach(shape => {
        CLARITY_LIST.forEach(clr => {
          const sP = parseFloat(state.table?.[range]?.[col]?.[shape]?.[clr]?.pcs) || 0;
          const sC = parseFloat(state.table?.[range]?.[col]?.[shape]?.[clr]?.cts) || 0;
          
          const polP = Math.round((sP * scaleFactor) * multiplier);
          const polC = (sC * scaleFactor) * (yieldPct / 100);
          
          const priceIdx = SIEVE_RANGES[range]?.priceIdx || "s1";
          const price = prices?.[shape]?.[priceIdx]?.[col]?.[clr] || 0;
          
          pcs += polP;
          cts += polC;
          val += (polC * price);
        });
      });
    });
    return { pcs, cts, val, yield: (cts / (getRoughCtsByRange(range) * scaleFactor)) * 100 || 0 };
  };

  // --- AGGREGATED TOTALS ---
  const ranges = state.ranges || [];
  // Use parcel total for rough cts display consistency
  const totalRoughCts = parcel.total_cts;
  let totalPolPcs = 0;
  let totalPolCts = 0;
  let totalPolVal = 0;

  ranges.forEach(r => {
    const rData = getPolishedDataByRange(r);
    totalPolPcs += rData.pcs;
    totalPolCts += rData.cts;
    totalPolVal += rData.val;
  });

  const avgYield = totalRoughCts > 0 ? (totalPolCts / totalRoughCts) * 100 : 0;
  const avgPricePerPolCt = totalPolCts > 0 ? totalPolVal / totalPolCts : 0;
  
  // Bid Calculations - Simple: Per Ct Pol $ - Labour ($/ct)
  const labourPerRoughCt = parseFloat(state.labour) || 0;
  const totalLabour = totalRoughCts * labourPerRoughCt;

  // Per Ct Pol $ = Total Polish Value ÷ Total Rough Cts
  const perCtPol = totalPolVal / totalRoughCts;

  // FINAL BID VALUE = Per Ct Pol $ - Labour ($/ct)
  const finalBidValue = (perCtPol - labourPerRoughCt) * totalRoughCts;

  // --- PROFILE TABLES ---
  const colorProfile = {};
  const clarityProfile = {};
  COLOUR_LIST.forEach(c => colorProfile[c] = 0);
  CLARITY_LIST.forEach(c => clarityProfile[c] = 0);

  ranges.forEach(r => {
    const target = state.sizeProfile?.[r] || { cts: 0 };
    const sampleRoughCts = getRoughCtsByRange(r);
    const scaleFactor = (target.cts > 0 && sampleRoughCts > 0) ? (target.cts / sampleRoughCts) : 1;
    const rangeCfg = state.rangeConfig?.[r] || { yield: 44 };
    const yieldPct = parseFloat(rangeCfg.yield) || 44;

    COLOUR_LIST.forEach(col => {
      Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
        CLARITY_LIST.forEach(clr => {
          const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
          const polC = (sC * scaleFactor) * (yieldPct / 100);
          colorProfile[col] += polC;
          clarityProfile[clr] += polC;
        });
      });
    });
  });

  // Usable vs Non-Usable
  // Usable: D-H (DEF, G, H) / VVS or VS1
  let usableRough = 0; let usablePol = 0; let usableVal = 0;
  let nonUsableRough = 0; let nonUsablePol = 0; let nonUsableVal = 0;

  // Detailed pcs breakdown
  let usablePcs = { DEF: { VVS: 0, VS1: 0 }, G: { VVS: 0, VS1: 0 }, H: { VVS: 0, VS1: 0 } };
  let nonUsablePcs = { I: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 }, J: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 }, K: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 } };

  ranges.forEach(r => {
    const target = state.sizeProfile?.[r] || { cts: 0 };
    const sampleRoughCts = getRoughCtsByRange(r);
    const scaleFactor = (target.cts > 0 && sampleRoughCts > 0) ? (target.cts / sampleRoughCts) : 1;
    const rangeCfg = state.rangeConfig?.[r] || { yield: 44, roundMultiplier: 1, fancyMultiplier: 1.5 };
    const yieldPct = parseFloat(rangeCfg.yield) || 44;
    const roundMultiplier = parseFloat(rangeCfg.roundMultiplier) || 1;
    const fancyMultiplier = parseFloat(rangeCfg.fancyMultiplier) || 1.5;

    COLOUR_LIST.forEach(col => {
      Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
        const isRound = shape === "Round";
        const shapeMultiplier = isRound ? roundMultiplier : fancyMultiplier;
        CLARITY_LIST.forEach(clr => {
          const sP = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
          const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
          const cMult = parseFloat(rangeCfg.clarityMultipliers?.[clr]) || 1;
          const roughC = sC * scaleFactor;
          const polP = Math.round((sP * scaleFactor * cMult) * shapeMultiplier);
          const polC = roughC * (yieldPct / 100);
          const priceIdx = SIEVE_RANGES[r]?.priceIdx || "s1";
          const price = prices?.[shape]?.[priceIdx]?.[col]?.[clr] || 0;
          const val = polC * price;

          const isUsable = ["DEF", "G", "H"].includes(col) && ["VVS", "VS1"].includes(clr);
          const isNonUsable = ["I", "J", "K"].includes(col) && ["VS2", "SI1", "SI2", "I1", "I2"].includes(clr);
          if (isUsable) {
            usableRough += roughC; usablePol += polC; usableVal += val;
            usablePcs[col][clr] += polP;
          } else if (isNonUsable) {
            nonUsableRough += roughC; nonUsablePol += polC; nonUsableVal += val;
            nonUsablePcs[col][clr] += polP;
          }
        });
      });
    });
  });

  return (
    <div className="summary-report-container">
      {/* 1. HEADER SUMMARY */}
      <div className="report-header-grid">
        <div className="report-title-box">
          <h1 style={{margin:0, fontSize:28, fontWeight:900}}>{parcel.number || 'Lot 80'}</h1>
          <p style={{margin:0, opacity:0.6, fontSize:12}}>{parcel.name} | {tender.name}</p>
        </div>
        <div className="stat-card">
          <label>Rough Cts</label>
          <div className="val">{formatNum(totalRoughCts, 2)}</div>
        </div>
        <div className="stat-card">
          <label>Polish Cts</label>
          <div className="val">{formatNum(totalPolCts, 2)}</div>
        </div>
        <div className="stat-card">
          <label>Polish Pcs</label>
          <div className="val">{formatNum(totalPolPcs, 0)}</div>
        </div>
        <div className="stat-card">
          <label>Avg Yield</label>
          <div className="val text-gold">{formatNum(avgYield, 1)}%</div>
        </div>
        <div className="stat-card">
          <label>Polish Value</label>
          <div className="val text-green">${formatNum(totalPolVal, 0)}</div>
        </div>
        <div className="stat-card">
          <label>$/ct (Polish)</label>
          <div className="val">${formatNum(avgPricePerPolCt, 0)}</div>
        </div>
        <div className="stat-card highlighted">
          <label>Total Bid</label>
          <div className="val">${formatNum(finalBidValue, 0)}</div>
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
            const rData = getPolishedDataByRange(r);
            const target = state.sizeProfile?.[r] || { cts: 0 };
            const sieveInfo = MASTER_SIZE_CHART.find(m => m.sieve.includes(r)) || { sieve: r };
            return (
              <tr key={r}>
                <td style={{fontWeight:700}}>{r}</td>
                <td>{formatNum(target.cts, 2)}</td>
                <td>{formatNum(rData.pcs, 0)}</td>
                <td>{formatNum(rData.cts, 2)}</td>
                <td>{formatNum(rData.yield, 1)}%</td>
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
            <td>{formatNum(usableRough, 2)}</td>
            <td>{formatNum(usablePol, 2)}</td>
            <td>${formatNum(usableVal, 0)}</td>
            <td>${usableRough > 0 ? (usableVal / usableRough).toFixed(2) : 0}</td>
            <td>{totalPolCts > 0 ? ((usablePol / totalPolCts) * 100).toFixed(1) : 0}%</td>
            <td>{totalPolVal > 0 ? ((usableVal / totalPolVal) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td style={{fontWeight:700}}>Non-Usable (I-JK / VS2 & below)</td>
            <td>{formatNum(nonUsableRough, 2)}</td>
            <td>{formatNum(nonUsablePol, 2)}</td>
            <td>${formatNum(nonUsableVal, 0)}</td>
            <td>${nonUsableRough > 0 ? (nonUsableVal / nonUsableRough).toFixed(2) : 0}</td>
            <td>{totalPolCts > 0 ? ((nonUsablePol / totalPolCts) * 100).toFixed(1) : 0}%</td>
            <td>{totalPolVal > 0 ? ((nonUsableVal / totalPolVal) * 100).toFixed(1) : 0}%</td>
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
      <div className="section-title" style={{marginTop:30}}>BID SUMMARY</div>
      <div className="bid-summary-grid">
         <div className="bid-item"><span>Total Polish Value</span><b>${formatNum(totalPolVal, 2)}</b></div>
         <div className="bid-item"><span>Polish $ / Rough Ct</span><b>${totalRoughCts > 0 ? (totalPolVal / totalRoughCts).toFixed(2) : 0}</b></div>
         <div className="bid-item"><span>Labour / Rough Ct</span><b>${formatNum(labourPerRoughCt, 2)}</b></div>
          <div className="bid-item"><span>Final Bid $ / Rough Ct</span><b>${totalRoughCts > 0 ? (finalBidValue / totalRoughCts).toFixed(2) : 0}</b></div>
         <div className="bid-item highlight"><span>Total Labour ({formatNum(totalRoughCts, 2)} cts)</span><b>${formatNum(totalLabour, 0)}</b></div>
         <div className="bid-item highlight"><span>Total Bid Value</span><b>${formatNum(finalBidValue, 0)}</b></div>
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
        .report-header-grid {
          display: grid;
          grid-template-columns: 2fr repeat(7, 1fr);
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid var(--blue);
          padding-bottom: 20px;
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
        .stat-card.highlighted {
          background: var(--blue);
          border-color: var(--blue);
        }
        .stat-card.highlighted .val, .stat-card.highlighted label {
          color: #fff;
          opacity: 1;
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
