import React, { useState, useEffect } from 'react';
import { formatNum } from '../utils/calculations';
import { getPriceIdxByWeight } from '../utils/priceUtils';
import { COLOUR_LIST, CLARITY_LIST, SIEVE_RANGES, MASTER_SIZE_CHART } from '../constants/diamondData';

const ParcelComparisonReport = ({ parcels, tender, prices, onBack }) => {
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (parcels && parcels.length > 0) {
      // Sync internal selection with parcels passed from parent
      setSelectedParcels(parcels.map(p => p.id));
      
      // Only jump to comparison view if we have at least 2 parcels to compare
      if (parcels.length > 1) {
        setShowComparison(true);
      }
    }
  }, [parcels]);

  if (!parcels || parcels.length === 0) return <div className="p-20 text-center">No parcels available for comparison.</div>;

  const handleBack = () => {
    if (onBack) onBack();
  };

  const getPriceIdxByWeight = (w) => {
    if (w <= 0.004) return "r1";
    if (w <= 0.008) return "r2";
    if (w <= 0.021) return "r3";
    if (w <= 0.051) return "r4";
    if (w <= 0.077) return "r5";
    if (w <= 0.115) return "r6";
    if (w <= 0.158) return "r7";
    if (w <= 0.18) return "r8";
    if (w <= 0.22) return "r9";
    if (w <= 0.29) return "r10";
    if (w <= 0.39) return "r11";
    if (w <= 0.49) return "r12";
    if (w <= 0.69) return "r13";
    if (w <= 0.89) return "r14";
    if (w <= 0.99) return "r15";
    return "r16";
  };

  const getMMByWeight = (weight, chart) => {
    if (!chart || chart.length === 0 || weight <= 0) return "-";
    const markers = [];
    chart.forEach(row => {
       const weights = row.weight.split(',').map(w => parseFloat(w.trim()));
       const mms = row.mm.split(',').map(m => m.trim());
       weights.forEach((w, idx) => {
          if (!isNaN(w) && mms[idx]) {
             markers.push({ weight: w, mm: mms[idx] });
          }
       });
    });
    if (markers.length === 0) return "-";
    markers.sort((a, b) => a.weight - b.weight);
    let lower = null;
    let upper = null;
    for (let i = 0; i < markers.length; i++) {
       if (markers[i].weight <= weight) lower = markers[i];
       if (markers[i].weight >= weight) {
          upper = markers[i];
          break;
       }
    }
    if (!lower) lower = markers[0];
    if (!upper) upper = markers[markers.length - 1];
    const getMMBounds = (mmStr) => {
       const nums = mmStr.match(/[\d.]+/g);
       if (!nums || nums.length < 1) return { start: "?", end: "?" };
       return { start: nums[0], end: nums[1] || nums[0] };
    };
    const lowerBounds = getMMBounds(lower.mm);
    const upperBounds = getMMBounds(upper.mm);
    if (lower === upper) return lower.mm;
    return `${lowerBounds.start}-${upperBounds.end} mm`;
  };

  // Map range string to price index (e.g., "0.009-0.021" -> "r3")
  const getPriceIdxFromRange = (rangeStr) => {
    if (!rangeStr) return "r1";
    // Extract lower bound from range like "0.009-0.021"
    const match = rangeStr.match(/^([\d.]+)/);
    if (!match) return "r1";
    const weight = parseFloat(match[1]);
    
    if (weight <= 0.004) return "r1";
    if (weight <= 0.008) return "r2";
    if (weight <= 0.021) return "r3";
    if (weight <= 0.051) return "r4";
    if (weight <= 0.077) return "r5";
    if (weight <= 0.115) return "r6";
    if (weight <= 0.158) return "r7";
    if (weight <= 0.18) return "r8";
    if (weight <= 0.22) return "r9";
    if (weight <= 0.29) return "r10";
    if (weight <= 0.39) return "r11";
    if (weight <= 0.49) return "r12";
    if (weight <= 0.69) return "r13";
    if (weight <= 0.89) return "r14";
    if (weight <= 0.99) return "r15";
    return "r16";
  };

  // Calculate metrics for a parcel
  const calculateParcelMetrics = (parcel) => {
    const state = parcel.calc_state;
    if (!state || !state.table) return null;

    let roughCts = 0;
    let roughPcs = 0;
    let polCts = 0;
    let polPcs = 0;
    let polVal = 0;
    let usablePol = 0;
    let usableVal = 0;
    let nonUsablePol = 0;
    let nonUsableVal = 0;

    const colorProfile = {};
    const clarityProfile = {};
    COLOUR_LIST.forEach(c => colorProfile[c] = 0);
    CLARITY_LIST.forEach(c => clarityProfile[c] = 0);

    const fluo = state.fluo || { "None": 100, "Fnt": 0, "Med/Stg": 0 };
    
    // For Shape & Size comparison
    let totalRoundPolP = 0;
    let totalRoundPolC = 0;
    const allShapes = new Set();

    const ranges = state.ranges || [];
    const clarityGroups = {
      high: ['VVS', 'VS1', 'VS2'],
      low: ['SI1', 'SI2', 'I1', 'I2']
    };

    ranges.forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0 };
      const sampleRoughCts = getRoughCtsByRange(state, r);
      const scaleFactor = (target.cts > 0 && sampleRoughCts > 0) ? (target.cts / sampleRoughCts) : 1;
      const rangeCfg = state.rangeConfig?.[r] || { yield: 44, roundYieldByClarity: {}, fancyYieldByClarity: {}, roundMultiplierByClarity: {}, fancyMultiplierByClarity: {} };
      const defaultYield = parseFloat(rangeCfg.yield) || 44;
      const roundYieldByClarity = rangeCfg.roundYieldByClarity || {};
      const fancyYieldByClarity = rangeCfg.fancyYieldByClarity || {};
      const roundMultiplierByClarity = rangeCfg.roundMultiplierByClarity || {};
      const fancyMultiplierByClarity = rangeCfg.fancyMultiplierByClarity || {};
      const roundMultiplier = parseFloat(rangeCfg.roundMultiplier) || 1;
      const fancyMultiplier = parseFloat(rangeCfg.fancyMultiplier) || 1.5;

      const getGroupAvgSize = (shape, clarities) => {
        let totalPolC = 0;
        let totalPolP = 0;
        for (const col of COLOUR_LIST) {
          for (const clr of clarities) {
            const sPcs = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
            const sCts = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
            if (sCts > 0 && sPcs > 0) {
              const isRound = shape === "Round";
              const yld = isRound ? (parseFloat(roundYieldByClarity[clr]) || defaultYield) : (parseFloat(fancyYieldByClarity[clr]) || defaultYield);
              const mult = isRound ? (parseFloat(roundMultiplierByClarity[clr]) || roundMultiplier) : (parseFloat(fancyMultiplierByClarity[clr]) || fancyMultiplier);
              const polP = Math.round((sPcs * scaleFactor) * mult);
              const polC = sCts * scaleFactor * (yld / 100);
              totalPolC += polC;
              totalPolP += polP;
            }
          }
        }
        return totalPolP > 0 ? totalPolC / totalPolP : 0;
      };

      const groupAvgs = {
        Round: {
          high: getGroupAvgSize("Round", clarityGroups.high),
          low: getGroupAvgSize("Round", clarityGroups.low)
        },
        Fancy: {
          high: getGroupAvgSize("Fancy", clarityGroups.high),
          low: getGroupAvgSize("Fancy", clarityGroups.low)
        }
      };

      COLOUR_LIST.forEach(col => {
        Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
          CLARITY_LIST.forEach(clr => {
            const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
            const sP = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
            const isRound = shape === "Round";
            const yieldPct = isRound 
              ? (parseFloat(roundYieldByClarity[clr]) || defaultYield)
              : (parseFloat(fancyYieldByClarity[clr]) || defaultYield);
            const mult = isRound 
              ? (parseFloat(roundMultiplierByClarity[clr]) || roundMultiplier)
              : (parseFloat(fancyMultiplierByClarity[clr]) || fancyMultiplier);
            const polC = (sC * scaleFactor) * (yieldPct / 100);
            const polP = Math.round((sP * scaleFactor) * mult);
            
            const isHigh = clarityGroups.high.includes(clr);
            const priceShape = isRound ? "Round" : "Fancy";
            const grpAvg = isHigh ? groupAvgs[priceShape].high : groupAvgs[priceShape].low;
            const priceIdx = getPriceIdxByWeight(grpAvg);
            const price = prices?.[priceShape]?.[priceIdx]?.[col]?.[clr] || 0;
            const val = polC * price;

            polCts += polC;
            polVal += val;
            polPcs += parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;

            colorProfile[col] += polC;
            clarityProfile[clr] += polC;

            if (shape === "Round") {
              totalRoundPolP += Math.round((parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0) * scaleFactor);
              totalRoundPolC += polC;
            }
            allShapes.add(shape);

            const isUsable = ["DEF", "G", "H"].includes(col) && ["VVS", "VS1"].includes(clr);
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
      roughCts += parseFloat(target.cts) || 0;
      const avgSize = parseFloat(target.avg) || 0;
      roughPcs += avgSize > 0 ? Math.round((parseFloat(target.cts) || 0) / avgSize) : 0;
    });
    
    // Fallback: If no rough cts entered in size profile, use the parcel total_cts
    if (roughCts <= 0 && parcel.total_cts > 0) {
      roughCts = parcel.total_cts;
    }
    if (roughPcs <= 0 && parcel.pcs > 0) {
      roughPcs = parcel.pcs;
    }

    const labour = parseFloat(state.labour) || 0;

    // Per Ct Pol $ = Polish Value ÷ Rough Cts
    const perCtPol = polVal / roughCts;

    // FINAL BID VALUE = Per Ct Pol $ - Labour ($/ct)
    const finalBid = perCtPol - labour;

    const avgRoundSize = totalRoundPolP > 0 ? totalRoundPolC / totalRoundPolP : 0;
    const polMM = getMMByWeight(avgRoundSize, MASTER_SIZE_CHART);

    return {
      id: parcel.id,
      name: parcel.name,
      number: parcel.number,
      roughCts,
      roughPcs,
      polCts,
      polPcs,
      yield: roughCts > 0 ? (polCts / roughCts) * 100 : 0,
      polVal,
      polPerRough: roughCts > 0 ? polVal / roughCts : 0,
      usablePol,
      usableVal,
      nonUsablePol,
      nonUsableVal,
      colorProfile,
      clarityProfile,
      fluo,
      polMM,
      avgRoundSize,
      shapes: Array.from(allShapes).join(', '),
      finalBid
    };
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

  // Handle parcel selection
  const handleParcelSelect = (parcelId) => {
    setSelectedParcels(prev => {
      if (prev.includes(parcelId)) {
        return prev.filter(id => id !== parcelId);
      } else if (prev.length < 5) { // Limit to 5 parcels like the PDF
        return [...prev, parcelId];
      }
      return prev;
    });
  };

  // Calculate comparison data
  const comparisonData = selectedParcels.map(id => {
    const parcel = parcels.find(p => p.id === id);
    return calculateParcelMetrics(parcel);
  }).filter(data => data !== null);

  const handleGenerateComparison = () => {
    setShowComparison(true);
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.comparison-report');
    const opt = {
      margin: 0.5,
      filename: `parcel_comparison_${tender.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Parcel selection UI
  if (!showComparison) {
    return (
      <div className="comparison-selector">
        <div className="section-hdr">
          <h2>Parcel Comparison Tool</h2>
          <p>Select up to 5 parcels to compare side-by-side</p>
        </div>

        <div className="parcel-grid">
          {parcels.map(parcel => {
            const isSelected = selectedParcels.includes(parcel.id);
            const metrics = calculateParcelMetrics(parcel);

            return (
              <div
                key={parcel.id}
                className={`parcel-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleParcelSelect(parcel.id)}
              >
                <div className="card-header">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleParcelSelect(parcel.id)}
                    style={{marginRight: 8}}
                  />
                  <h3>Lot {parcel.number}</h3>
                </div>
                <div className="card-body">
                  <p>{parcel.name}</p>
                  {metrics && (
                    <div className="quick-stats">
                      <div>Rough: {formatNum(metrics.roughCts, 1)} cts</div>
                      <div>Yield: {formatNum(metrics.yield, 1)}%</div>
                      <div>Bid: ${formatNum(metrics.finalBid, 0)}/ct</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedParcels.length > 0 && (
          <div className="comparison-actions">
            <button
              className="btn btn-gold"
              onClick={handleGenerateComparison}
              disabled={selectedParcels.length < 2}
            >
              📊 Compare {selectedParcels.length} Parcels
            </button>
            <button className="btn btn-outline" onClick={() => setSelectedParcels([])}>
              Clear Selection
            </button>
          </div>
        )}

        <style jsx>{`
          .comparison-selector {
            padding: 20px;
          }
          .parcel-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .parcel-card {
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--bg2);
            position: relative;
            overflow: hidden;
          }
          .parcel-card:hover {
            border-color: var(--blue);
            transform: translateY(-4px);
            box-shadow: var(--shadow);
          }
          .parcel-card.selected {
            border-color: var(--amber);
            background: rgba(217, 119, 6, 0.05);
            box-shadow: 0 0 0 2px var(--amber);
          }
          .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .card-header h3 {
            margin: 0;
            color: var(--blue);
            font-size: 18px;
            font-weight: 800;
          }
          .card-body p {
            margin: 0 0 15px 0;
            color: var(--text2);
            font-size: 14px;
            font-weight: 500;
          }
          .quick-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 12px;
            color: var(--text3);
            background: var(--bg);
            padding: 10px;
            border-radius: 8px;
          }
          .comparison-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
          }
        `}</style>
      </div>
    );
  }

  // Comparison results UI
  return (
    <div className="comparison-report">
      <div className="report-header">
        <div className="title-section">
          <h1>PARCEL COMPARISON REPORT</h1>
          <p>{tender.name} | {comparisonData.length} Lots Compared</p>
        </div>
        <div className="report-actions">
          <button className="btn btn-outline" onClick={handleBack}>
            ← Back to Parcels
          </button>
          <button className="btn btn-gold" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Overview Metrics Table */}
      <div className="section-title">OVERVIEW — ROUGH & POLISH KEY METRICS</div>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            {comparisonData.map(data => (
              <th key={data.id}>Lot {data.number}<br/>{data.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rough Cts</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.roughCts, 2)} cts / {formatNum(data.roughPcs, 0)} pcs</td>
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
            <td>Avg Yield</td>
            {comparisonData.map(data => (
              <td key={data.id}>{formatNum(data.yield, 1)}%</td>
            ))}
          </tr>
          <tr>
            <td>Polish Value ($)</td>
            {comparisonData.map(data => (
              <td key={data.id} className="text-gold">${formatNum(data.polVal, 0)}</td>
            ))}
          </tr>
          <tr>
            <td>Pol $/Rough Ct</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.polPerRough, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Final Bid $/Rough Ct</td>
            {comparisonData.map(data => (
              <td key={data.id} className="text-green">${formatNum(data.finalBid, 2)}</td>
            ))}
          </tr>
          <tr>
            <td>Total Bid ($)</td>
            {comparisonData.map(data => (
              <td key={data.id} className="text-green">${formatNum(data.finalBid * data.roughCts, 0)}</td>
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
              <th key={data.id}>Lot {data.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COLOUR_LIST.map(color => (
            <tr key={color}>
              <td>{color}</td>
              {comparisonData.map(data => {
                const totalPol = data.polCts;
                const colorPol = data.colorProfile[color] || 0;
                const percentage = totalPol > 0 ? (colorPol / totalPol) * 100 : 0;
                return (
                  <td key={data.id}>{formatNum(percentage, 1)}%</td>
                );
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
              <th key={data.id}>Lot {data.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CLARITY_LIST.map(clarity => (
            <tr key={clarity}>
              <td>{clarity}</td>
              {comparisonData.map(data => {
                const totalPol = data.polCts;
                const clarityPol = data.clarityProfile[clarity] || 0;
                const percentage = totalPol > 0 ? (clarityPol / totalPol) * 100 : 0;
                return (
                  <td key={data.id}>{formatNum(percentage, 1)}%</td>
                );
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
              <th key={data.id}>Lot {data.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Usable % (pol cts)</td>
            {comparisonData.map(data => {
              const percentage = data.polCts > 0 ? (data.usablePol / data.polCts) * 100 : 0;
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
              const value = data.roughCts > 0 ? data.usableVal / data.roughCts : 0;
              return <td key={data.id}>${formatNum(value, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>Usable Pol Value</td>
            {comparisonData.map(data => (
              <td key={data.id} className="text-gold">${formatNum(data.usableVal, 0)}</td>
            ))}
          </tr>
          <tr>
            <td>Non-Usable % (pol cts)</td>
            {comparisonData.map(data => {
              const percentage = data.polCts > 0 ? (data.nonUsablePol / data.polCts) * 100 : 0;
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
              const value = data.roughCts > 0 ? data.nonUsableVal / data.roughCts : 0;
              return <td key={data.id}>${formatNum(value, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>Non-Usable Pol Value</td>
            {comparisonData.map(data => (
              <td key={data.id}>${formatNum(data.nonUsableVal, 0)}</td>
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
              <th key={data.id}>Lot {data.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>None / Faint (cts)</td>
            {comparisonData.map(data => {
              const none = parseFloat(data.fluo["None"]) || 0;
              const fnt = parseFloat(data.fluo["Fnt"]) || 0;
              const cts = data.roughCts * ((none + fnt) / 100);
              return <td key={data.id}>{formatNum(cts, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>None / Faint (%)</td>
            {comparisonData.map(data => {
              const none = parseFloat(data.fluo["None"]) || 0;
              const fnt = parseFloat(data.fluo["Fnt"]) || 0;
              return <td key={data.id}>{formatNum(none + fnt, 1)}%</td>;
            })}
          </tr>
          <tr>
            <td>Med / Strong (cts)</td>
            {comparisonData.map(data => {
              const med = parseFloat(data.fluo["Med/Stg"]) || 0;
              const cts = data.roughCts * (med / 100);
              return <td key={data.id}>{formatNum(cts, 2)}</td>;
            })}
          </tr>
          <tr>
            <td>Med / Strong (%)</td>
            {comparisonData.map(data => {
              const med = parseFloat(data.fluo["Med/Stg"]) || 0;
              return <td key={data.id}>{formatNum(med, 1)}%</td>;
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
            <th>Pol Cts</th>
            <th>Pol Pcs</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map(data => (
            <tr key={data.id}>
              <td style={{textAlign:'left'}}>Lot {data.number} {data.name}</td>
              <td>{data.shapes}</td>
              <td>{data.polMM}</td>
              <td>{formatNum(data.polCts, 2)}</td>
              <td>{formatNum(data.polPcs, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .comparison-report {
          background: var(--card);
          color: var(--text);
          padding: 30px;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: var(--shadow);
          max-width: 1400px;
          margin: 20px auto;
          border: 1px solid var(--border);
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid var(--blue);
          padding-bottom: 20px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 24px;
          color: var(--blue);
          font-weight: 800;
        }
        .title-section p {
          margin: 5px 0 0 0;
          opacity: 0.6;
          color: var(--text2);
        }
        .report-actions {
          display: flex;
          gap: 10px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--text3);
          margin: 30px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
          background: var(--card);
        }
        .comparison-table th {
          background: var(--bg2);
          color: var(--text2);
          text-align: left;
          padding: 12px;
          font-size: 11px;
          text-transform: uppercase;
          border: 1px solid var(--border);
        }
        .comparison-table td {
          padding: 10px 12px;
          border: 1px solid var(--border);
          text-align: center;
          color: var(--text);
        }
        .comparison-table th:first-child {
          text-align: left;
          min-width: 150px;
        }
        .comparison-table td:first-child {
          text-align: left;
          font-weight: 600;
          color: var(--blue);
        }
        .total-row {
          background: var(--bg2);
          font-weight: 800;
        }
        .text-gold { color: var(--amber) !important; }
        .text-green { color: var(--green) !important; }

        @media print {
          .comparison-report {
             background: #fff !important;
             color: #000 !important;
             padding: 0 !important;
             box-shadow: none !important;
             border: none !important;
          }
          .comparison-table th {
             background: #f1f5f9 !important;
             color: #000 !important;
             border: 1px solid #cbd5e1 !important;
          }
          .comparison-table td {
             border: 1px solid #cbd5e1 !important;
             color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ParcelComparisonReport;