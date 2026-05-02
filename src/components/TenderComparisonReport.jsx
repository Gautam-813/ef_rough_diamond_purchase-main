import React from 'react';
import html2pdf from 'html2pdf.js';
import { formatNum } from '../utils/calculations';
import { COLOUR_LIST, CLARITY_LIST, SIEVE_RANGES } from '../constants/diamondData';

const TenderComparisonReport = ({ tenders, prices, onBack }) => {
  if (!tenders || tenders.length === 0) return <div className="p-20 text-center">No tenders selected for comparison.</div>;

  // Helper: Get Price Index (r1-r8) based on weight
  const getPriceIdxByWeight = (w) => {
    if (w <= 0.004) return "r1";
    if (w <= 0.008) return "r2";
    if (w <= 0.021) return "r3";
    if (w <= 0.051) return "r4";
    if (w <= 0.077) return "r5";
    if (w <= 0.115) return "r6";
    if (w <= 0.158) return "r7";
    return "r8";
  };

  // Helper function for rough cts calculation
  const getRoughCtsByRange = (state, range) => {
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

  // Calculate detailed metrics for a tender
  const calculateTenderMetrics = (tender, prices) => {
    let totalRough = 0;
    let totalPol = 0;
    let totalPolPcs = 0;
    let totalVal = 0;
    let usablePol = 0;
    let usableVal = 0;
    let nonUsablePol = 0;
    let nonUsableVal = 0;
    let fluorNoneFaintCts = 0;
    let fluorMedStrongCts = 0;
    const shapeData = {};
    const colorProfile = {};
    const clarityProfile = {};
    COLOUR_LIST.forEach(c => colorProfile[c] = 0);
    CLARITY_LIST.forEach(c => clarityProfile[c] = 0);

    // Aggregate from all parcels in the tender
    tender.parcels?.forEach(parcel => {
      const state = parcel.calc_state;
      if (!state || !state.table) return;

      const ranges = state.ranges || [];
      ranges.forEach(r => {
        const target = state.sizeProfile?.[r] || { cts: 0 };
        const sampleRoughCts = getRoughCtsByRange(state, r);
        const scaleFactor = (target.cts > 0 && sampleRoughCts > 0) ? (target.cts / sampleRoughCts) : 1;
        const rangeCfg = state.rangeConfig?.[r] || { yield: 44, clarityMultipliers: {} };
        const yieldPct = parseFloat(rangeCfg.roundYield) || parseFloat(rangeCfg.yield) || 44;
        const clarityMults = rangeCfg.clarityMultipliers || {};

        totalRough += target.cts;

        COLOUR_LIST.forEach(col => {
          Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
            const isRound = shape === "Round";
            const shapeYield = isRound ? (parseFloat(rangeCfg.roundYield) || yieldPct) : (parseFloat(rangeCfg.fancyYield) || 40);
            const shapeMult = isRound ? (parseFloat(rangeCfg.roundMultiplier) || 1) : (parseFloat(rangeCfg.fancyMultiplier) || 1.5);
            
            if (!shapeData[shape]) {
              shapeData[shape] = { polCts: 0, polPcs: 0 };
            }
            
            CLARITY_LIST.forEach(clr => {
              const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
              const sP = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
              const cMult = parseFloat(clarityMults[clr]) || 1;
              
              const polC = (sC * scaleFactor * cMult) * (shapeYield / 100);
              const polP = Math.round(sP * scaleFactor * cMult * shapeMult);
              
              const priceShape = isRound ? "Round" : "Fancy";
              const priceIdx = SIEVE_RANGES[r]?.priceIdx || "s1";
              const price = prices?.[priceShape]?.[priceIdx]?.[col]?.[clr] || 0;
              const val = polC * price;

              totalPol += polC;
              totalVal += val;
              totalPolPcs += polP;
              
              shapeData[shape].polCts += polC;
              shapeData[shape].polPcs += polP;

              colorProfile[col] += polC;
              clarityProfile[clr] += polC;

              const fluorRatio = 0.85;
              fluorNoneFaintCts += polC * fluorRatio;
              fluorMedStrongCts += polC * (1 - fluorRatio);

              const isUsable = ["D", "E", "F", "G", "H"].includes(col) && ["IF", "VVS", "VS1"].includes(clr);
              if (isUsable) {
                usablePol += polC;
                usableVal += val;
              } else {
                nonUsablePol += polC;
                nonUsableVal += val;
              }
            });
          });
        });
      });
    });

    const labour = tender.parcels?.reduce((sum, p) => sum + (parseFloat(p.calc_state?.labour) || 0), 0) || 0;
    const perCtPol = totalRough > 0 ? totalVal / totalRough : 0;
    const finalBid = perCtPol - labour;

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
      usablePol,
      usableVal,
      nonUsablePol,
      nonUsableVal,
      colorProfile,
      clarityProfile,
      finalBid,
      fluorNoneFaintCts,
      fluorMedStrongCts,
      shapeData
    };
  };

  // Aggregate metrics for each tender
  const comparisonData = tenders.map(tender => calculateTenderMetrics(tender, prices));

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
              <td key={data.id}>${formatNum(data.finalBid || 0, 0)}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Color Profile Comparison */}
      <div className="section-title">COLOUR PROFILE COMPARISON (% of pol cts)</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Colour</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: 'DEF', colors: ['D', 'E', 'F'] },
            { label: 'G', colors: ['G'] },
            { label: 'H', colors: ['H'] },
            { label: 'IJ', colors: ['I', 'J', 'K'] }
          ].map(group => (
            <tr key={group.label}>
              <td>{group.label}</td>
              {comparisonData.map(data => {
                const totalPol = data.polCts || data.roughCts || 0;
                const groupPol = group.colors.reduce((sum, col) => sum + (data.colorProfile[col] || 0), 0);
                const percentage = totalPol > 0 ? (groupPol / totalPol) * 100 : 0;
                return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
              })}
            </tr>
          ))}
          <tr className="total-row">
            <td>TOTAL</td>
            {comparisonData.map(data => (
              <td key={data.id}>100.0%</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Clarity Profile Comparison */}
      <div className="section-title">CLARITY PROFILE COMPARISON (% of pol cts)</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Clarity</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: 'VVS', clarities: ['IF', 'VVS'] },
            { label: 'VS1', clarities: ['VS1'] },
            { label: 'VS2', clarities: ['VS2'] },
            { label: 'SI1', clarities: ['SI1'] },
            { label: 'SI2', clarities: ['SI2'] }
          ].map(group => (
            <tr key={group.label}>
              <td>{group.label}</td>
              {comparisonData.map(data => {
                const totalPol = data.polCts || data.roughCts || 0;
                const groupPol = group.clarities.reduce((sum, clr) => sum + (data.clarityProfile[clr] || 0), 0);
                const percentage = totalPol > 0 ? (groupPol / totalPol) * 100 : 0;
                return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
              })}
            </tr>
          ))}
          <tr className="total-row">
            <td>TOTAL</td>
            {comparisonData.map(data => (
              <td key={data.id}>100.0%</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Usable vs Non-Usable Comparison */}
      <div className="section-title">USABLE vs NON-USABLE COMPARISON</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Category</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Usable % (pol cts)</td>
            {comparisonData.map(data => {
              const totalPol = data.polCts || data.roughCts || 0;
              const percentage = totalPol > 0 ? ((data.usablePol || 0) / totalPol) * 100 : 0;
              return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Usable % (pol value)</td>
            {comparisonData.map(data => {
              const percentage = data.polVal > 0 ? (data.usableVal / data.polVal) * 100 : 0;
              return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Usable Pol $/Rough Ct</td>
            {comparisonData.map(data => {
              const value = data.roughCts > 0 ? (data.usableVal || 0) / data.roughCts : 0;
              return <td key={data.id}>${formatNum(value, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>Usable Pol Value</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.usableVal || 0, 0)}</td>
            ))}
          </tr>
          <tr>
            <td>Non-Usable % (pol cts)</td>
            {comparisonData.map(data => {
              const totalPol = data.polCts || data.roughCts || 0;
              const percentage = totalPol > 0 ? ((data.nonUsablePol || 0) / totalPol) * 100 : 0;
              return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Non-Usable % (pol value)</td>
            {comparisonData.map(data => {
              const percentage = data.polVal > 0 ? (data.nonUsableVal / data.polVal) * 100 : 0;
              return <td key={data.id}>{formatNum(percentage, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Non-Usable Pol $/Rough Ct</td>
            {comparisonData.map(data => {
              const value = data.roughCts > 0 ? (data.nonUsableVal || 0) / data.roughCts : 0;
              return <td key={data.id}>${formatNum(value, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>Non-Usable Pol Value</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.nonUsableVal || 0, 0)}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Fluorescence Comparison */}
      <div className="section-title">FLUORESCENCE COMPARISON (rough cts basis)</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Fluorescence</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>None / Faint (cts)</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.fluorNoneFaintCts || 0, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>None / Faint (%)</td>
            {comparisonData.map(data => {
              const totalPol = data.polCts || data.roughCts || 0;
              const pct = totalPol > 0 ? ((data.fluorNoneFaintCts || 0) / totalPol) * 100 : 0;
              return <td key={data.id}>{formatNum(pct, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Med / Strong (cts)</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.fluorMedStrongCts || 0, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Med / Strong (%)</td>
            {comparisonData.map(data => {
              const totalPol = data.polCts || data.roughCts || 0;
              const pct = totalPol > 0 ? ((data.fluorMedStrongCts || 0) / totalPol) * 100 : 0;
              return <td key={data.id}>{formatNum(pct, 1)}%</td>;
            })}
          </tr>
        </tbody>
      </table>

      {/* Shape & Polish Size Comparison */}
      <div className="section-title">SHAPE & POLISH SIZE COMPARISON</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Shapes</th>
            <th>Polish Size (Rounds)</th>
            {comparisonData.map(data => (
              <th key={data.id}>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['Round', 'Pear', 'Oval', 'Baguette', 'Triangle'].map(shape => {
            const lotsData = comparisonData.map(data => {
              return data.shapeData?.[shape] || null;
            });
            const hasAnyData = lotsData.some(d => d && (d.polCts > 0 || d.polPcs > 0));
            if (!hasAnyData) return null;
            
            return (
              <tr key={shape}>
                <td>Tender {shape}</td>
                <td>{shape === 'Round' ? 'Rounds only' : 'Various'}</td>
                <td>{shape === 'Round' ? 'Various' : '-'}</td>
                {comparisonData.map((data, idx) => (
                  <td key={data.id}>{formatNum(lotsData[idx]?.polCts || 0, 2)}</td>
                ))}
              </tr>
            );
          })}
          <tr className="total-row">
            <td colSpan={2}>Pol Pcs</td>
            <td>-</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.polPcs || 0, 0)}</td>
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
          color: var(--text3, #64748b);
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
          color: var(--text, #fff);
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