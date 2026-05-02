import React, { useState, useEffect } from 'react';
import { formatNum } from '../utils/calculations';
import { COLOUR_LIST, CLARITY_LIST, SIEVE_RANGES } from '../constants/diamondData';

const ParcelComparisonReport = ({ parcels, tender, prices, onBack }) => {
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    // If parcels are passed and onBack is present, it means we came from the "Compare Selected" 
    // button in the dashboard. In this case, we should auto-select all passed parcels.
    if (parcels && parcels.length > 0 && onBack) {
      setSelectedParcels(parcels.map(p => p.id));
      setShowComparison(true);
    }
  }, [parcels, onBack]);

  if (!parcels || parcels.length === 0) return <div className="p-20 text-center">No parcels available for comparison.</div>;

  const handleBack = () => {
    if (onBack) onBack();
  };

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

// Calculate metrics for a parcel
  const calculateParcelMetrics = (parcel) => {
    const state = parcel.calc_state;
    
    // Check if we have any calculation data
    const hasRanges = state?.ranges && state.ranges.length > 0;
    const hasSizeProfile = state?.sizeProfile && Object.keys(state.sizeProfile).length > 0;
    
    // If no calc_state, use parcel's own fields
    const useParcelFields = !state || (!hasRanges && !hasSizeProfile);
    
    if (useParcelFields) {
      // Use parcel's total_cts and pcs directly
      const roughCts = parcel.total_cts || 0;
      const polPcs = parcel.pcs || 0;
      const yieldPct = 40;
      const polCts = roughCts * (yieldPct / 100);
      const estimatedPrice = 150;
      const polVal = polCts * estimatedPrice;
      
      return {
        id: parcel.id,
        name: parcel.name,
        number: parcel.number,
        roughCts,
        polCts,
        polPcs,
        yield: yieldPct,
        polVal,
        polPerRough: roughCts > 0 ? polVal / roughCts : 0,
        usablePol: polCts * 0.5,
        usableVal: polVal * 0.5,
        nonUsablePol: polCts * 0.5,
        nonUsableVal: polVal * 0.5,
        colorProfile: {},
        clarityProfile: {},
        finalBid: roughCts > 0 ? (polVal / roughCts) - 35 : 0,
        fluorNoneFaintCts: polCts * 0.85,
        fluorMedStrongCts: polCts * 0.15,
        shapeData: { 'Round': { polCts, polPcs } }
      };
    }

    let roughCts = 0;
    let polCts = 0;
    let polPcs = 0;
    let polVal = 0;
    let usablePol = 0;
    let usableVal = 0;
    let nonUsablePol = 0;
    let nonUsableVal = 0;

    // Fluorescence tracking
    let fluorNoneFaintCts = 0;
    let fluorMedStrongCts = 0;

    // Shape tracking
    const shapeData = {};

    const colorProfile = {};
    const clarityProfile = {};
    COLOUR_LIST.forEach(c => colorProfile[c] = 0);
    CLARITY_LIST.forEach(c => clarityProfile[c] = 0);

    const hasTableData = state.table && Object.keys(state.table).length > 0;
    const ranges = state.ranges || Object.keys(state.sizeProfile || {});
    
    ranges.forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0, avg: 0 };
      const cts = parseFloat(target.cts) || 0;
      const avg = parseFloat(target.avg) || 0;
      const rangeCfg = state.rangeConfig?.[r] || { yield: 44, clarityMultipliers: {} };
      const yieldPct = parseFloat(rangeCfg.roundYield) || parseFloat(rangeCfg.yield) || 44;
      
      roughCts += cts;
      
      if (hasTableData) {
        // Full calculation with table data
        COLOUR_LIST.forEach(col => {
          Object.keys(state.table?.[r]?.[col] || {}).forEach(shape => {
            const isRound = shape === "Round";
            const shapeYield = isRound ? (parseFloat(rangeCfg.roundYield) || yieldPct) : (parseFloat(rangeCfg.fancyYield) || 40);
            const shapeMult = isRound ? (parseFloat(rangeCfg.roundMultiplier) || 1) : (parseFloat(rangeCfg.fancyMultiplier) || 1.5);
            const clarityMults = rangeCfg.clarityMultipliers || {};
            
            if (!shapeData[shape]) {
              shapeData[shape] = { polCts: 0, polPcs: 0 };
            }
            
            CLARITY_LIST.forEach(clr => {
              const sC = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
              const sP = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
              const cMult = parseFloat(clarityMults[clr]) || 1;
              
              const polC = sC * (shapeYield / 100);
              const polP = Math.round(sP * shapeMult);
              
              const priceShape = isRound ? "Round" : "Fancy";
              const priceIdx = SIEVE_RANGES[r]?.priceIdx || "s1";
              const price = prices?.[priceShape]?.[priceIdx]?.[col]?.[clr] || 0;
              const val = polC * price;

              polCts += polC;
              polVal += val;
              polPcs += polP;

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
      } else {
        // Simplified calculation - just use sizeProfile
        const pcs = avg > 0 ? Math.round(cts / avg) : 0;
        polPcs += pcs;
        
        const polC = cts * (yieldPct / 100);
        polCts += polC;
        
        // Estimate value using default price
        polVal += polC * 150;
        
        const fluorRatio = 0.85;
        fluorNoneFaintCts += polC * fluorRatio;
        fluorMedStrongCts += polC * (1 - fluorRatio);
        
shapeData['Round'] = shapeData['Round'] || { polCts: 0, polPcs: 0 };
        shapeData['Round'].polCts += polC;
        shapeData['Round'].polPcs += pcs;
      }
    });

    const labour = parseFloat(state.labour) || 0;

    // Per Ct Pol $ = Polish Value ÷ Rough Cts
    const perCtPol = roughCts > 0 ? polVal / roughCts : 0;

    // FINAL BID VALUE = Per Ct Pol $ - Labour ($/ct)
    const finalBid = perCtPol - labour;

    return {
      id: parcel.id,
      name: parcel.name,
      number: parcel.number,
      roughCts,
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
      finalBid,
      // Fluorescence data
      fluorNoneFaintCts,
      fluorMedStrongCts,
      // Shape data
      shapeData
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

  // Calculate comparison data - use selectedParcels if available, otherwise fallback to all parcels if showComparison is true
  const displayList = selectedParcels.length > 0 
    ? selectedParcels.map(id => parcels.find(p => p.id === id)).filter(Boolean)
    : (showComparison ? parcels : []);

  const comparisonData = displayList.map(parcel => calculateParcelMetrics(parcel));

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
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          .parcel-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
            background: #fff;
          }
          .parcel-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .parcel-card.selected {
            border-color: #fbbf24;
            background: #fefce8;
          }
          .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .card-header h3 {
            margin: 0;
            color: #1e293b;
          }
          .card-body p {
            margin: 5px 0;
            color: #64748b;
            font-size: 14px;
          }
          .quick-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 5px;
            margin-top: 10px;
            font-size: 12px;
            color: #475569;
          }
          .comparison-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
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
          {[
            { label: 'DEF', colors: ['D', 'E', 'F'] },
            { label: 'G', colors: ['G'] },
            { label: 'H', colors: ['H'] },
            { label: 'IJ', colors: ['I', 'J', 'K'] }
          ].map(group => (
            <tr key={group.label}>
              <td>{group.label}</td>
              {comparisonData.map(data => {
                const totalPol = data.polCts;
                const groupPol = group.colors.reduce((sum, col) => sum + (data.colorProfile[col] || 0), 0);
                const percentage = totalPol > 0 ? (groupPol / totalPol) * 100 : 0;
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
                const totalPol = data.polCts;
                const groupPol = group.clarities.reduce((sum, clr) => sum + (data.clarityProfile[clr] || 0), 0);
                const percentage = totalPol > 0 ? (groupPol / totalPol) * 100 : 0;
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
              <th key={data.id}>Lot {data.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Round shapes */}
          {[
            { id: 'Round', label: 'Round', shapes: 'Rounds only' },
            { id: 'Pear', label: 'Pear', shapes: 'Pears' },
            { id: 'Oval', label: 'Oval', shapes: 'Ovals' },
            { id: 'Baguette', label: 'Baguette', shapes: 'Baguettes' },
            { id: 'Triangle', label: 'Triangle', shapes: 'Triangles' }
          ].map(item => {
            const lotsData = comparisonData.map(data => {
              // Find the data for this specific shape
              const shapeKey = Object.keys(data.shapeData || {}).find(s => 
                s.toLowerCase().includes(item.id.toLowerCase())
              );
              return shapeKey ? data.shapeData[shapeKey] : null;
            });
            const hasAnyData = lotsData.some(d => d && (d.polCts > 0 || d.polPcs > 0));
            if (!hasAnyData) return null;
            
            return (
              <tr key={item.id}>
                <td>Parcel {item.label}</td>
                <td>{item.shapes}</td>
                <td>{item.id === 'Round' ? 'Various' : '-'}</td>
                {comparisonData.map((data, idx) => (
                  <td key={data.id}>{formatNum(lotsData[idx]?.polCts || 0, 2)}</td>
                ))}
              </tr>
            );
          })}
          {/* Pol Pcs row */}
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
        .comparison-report {
          background: var(--bg, #fff);
          color: var(--text, #1e293b);
          padding: 30px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          max-width: 1200px;
          margin: 20px auto;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid var(--blue, #1e3a8a);
          padding-bottom: 20px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 24px;
          color: var(--blue, #1e3a8a);
        }
        .title-section p {
          margin: 5px 0 0 0;
          opacity: 0.6;
        }
        .report-actions {
          display: flex;
          gap: 10px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #64748b;
          margin: 30px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .comparison-table th {
          background: var(--card2, #1e293b);
          color: var(--text, #fff);
          text-align: left;
          padding: 12px;
          font-size: 11px;
          text-transform: uppercase;
          border: 1px solid #374151;
        }
        .comparison-table td {
          padding: 10px 12px;
          border: 1px solid var(--border, #e2e8f0);
          text-align: center;
        }
        .comparison-table th:first-child {
          text-align: left;
          min-width: 150px;
        }
        .comparison-table td:first-child {
          text-align: left;
          font-weight: 600;
        }
        .total-row {
          background: #f8fafc;
          font-weight: 800;
        }
        .text-gold { color: #b45309; }
        .text-green { color: #15803d; }
      `}</style>
    </div>
  );
};

export default ParcelComparisonReport;