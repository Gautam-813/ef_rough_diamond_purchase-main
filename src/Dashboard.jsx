import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from './context/UserContext';
import { api } from './services/api';
import NumericInput from './components/NumericInput';
import { 
  COLOUR_LIST, 
  CLARITY_LIST, 
  SIEVE_RANGES, 
  PRICE_LISTS, 
  PRICE_SIEVES,
  isHotSize,
  MASTER_SIZE_CHART
} from './constants/diamondData';
import { formatNum } from './utils/calculations';
import AdminPanel from './AdminPanel';
import ParcelSummaryReport from './components/ParcelSummaryReport';
import TenderSummaryReport from './components/TenderSummaryReport';

// Helper: Get Price Index (r1-r8) based on weight
const getPriceIdxByWeight = (w) => {
  if (w <= 0.004) return "r1";
  if (w <= 0.008) return "r2";
  if (w <= 0.021) return "r3";
  if (w <= 0.051) return "r4";
  if (w <= 0.077) return "r5";
  if (w <= 0.115) return "r6";
  if (w <= 0.158) return "r7";
  return "r8"; // 0.159+
};

// Helper: Get MM Range matching BOTH Sieve Name and weight
// Handles composite names like "-7+5" by combining ranges
const getMMBySieveAndWeight = (sieveName, weight, chart) => {
  if (!sieveName || !chart) return "-";
  
  // 1. Split composite name into parts (e.g. "-7+5" -> ["-7", "+5"])
  // This regex finds segments starting with + or - followed by numbers
  const parts = sieveName.match(/[+-][\d.]+/g) || [sieveName];
  
  let allMin = Infinity;
  let allMax = -Infinity;
  let foundAny = false;

  parts.forEach(part => {
     const rows = chart.filter(r => r.sieve.toLowerCase().includes(part.toLowerCase()));
     if (rows.length === 0) return;

     rows.forEach(row => {
        const weights = row.weight.split(',').map(w => parseFloat(w.trim()));
        const mms = row.mm.split(',').map(m => m.trim());
        
        // Find best match in this row
        let bestIdx = 0;
        let minDiff = Infinity;
        weights.forEach((w, idx) => {
           const diff = Math.abs(w - weight);
           if (diff < minDiff) {
              minDiff = diff;
              bestIdx = idx;
           }
        });

        const mmStr = mms[bestIdx] || mms[0];
        // Extract numbers from MM string like "1.55-1.60" or "1.90 to 2.00"
        const nums = mmStr.match(/[\d.]+/g);
        if (nums && nums.length >= 2) {
           const low = parseFloat(nums[0]);
           const high = parseFloat(nums[1]);
           if (low < allMin) allMin = low;
           if (high > allMax) allMax = high;
           foundAny = true;
        }
     });
  });
  
  if (!foundAny) return "-";
  return `${allMin.toFixed(2)} - ${allMax.toFixed(2)}`;
};

// Final Valuation Summary (The "Verdict" table from your image)
const FinalValuationTable = ({ totals, parcelData, state, onUpdate }) => {
  const perCtPol = parcelData.total_cts > 0 ? (totals.totalValue / parcelData.total_cts) : 0;
  const yieldFactor = (state.yield || 30) / 100;
  const finalBidValue = (perCtPol - (state.labour || 0)) * yieldFactor;

  return (
    <div className="card glass verdict-card">
       <div className="card-hdr" style={{background:'#1e3a8a', color:'#fff'}}>FINAL PURCHASE VERDICT</div>
       <table className="profile-table">
          <tbody>
             <tr><td>Total POL $</td><td className="text-gold">$ {formatNum(totals.totalValue, 2)}</td></tr>
             <tr><td>Rough Cts</td><td>{parcelData.total_cts}</td></tr>
             <tr><td>Per Ct Pol $</td><td>{formatNum(perCtPol, 4)}</td></tr>
             <tr>
                <td>Labour ($/ct)</td>
                <td>
                   <NumericInput 
                      value={state.labour || 0} 
                      onChange={v => onUpdate('labour', v)} 
                      style={{width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--gold)', fontWeight: 700}}
                   />
                </td>
             </tr>
             <tr>
                <td>Avg Yield %</td>
                <td>
                   <NumericInput 
                      value={state.yield || 0} 
                      onChange={v => onUpdate('yield', v)} 
                      style={{width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: '#fff'}}
                   />
                </td>
             </tr>
             <tr className="verdict-row">
                <td style={{fontWeight:800}}>FINAL BID VALUE</td>
                <td className="text-green" style={{fontSize:18}}>$ {formatNum(finalBidValue, 2)}</td>
             </tr>
          </tbody>
       </table>
       {totals.hotCts > 0 && (
          <div className="hot-stat-banner">
             🔥 {formatNum(totals.hotCts, 2)} cts in Hot Demand Bands
             <small style={{display:'block', fontSize:10, opacity:0.7}}>
                {((totals.hotCts / totals.totalCts) * 100).toFixed(1)}% of Polished Weight
             </small>
          </div>
       )}
    </div>
  );
};

export default function Dashboard() {
  const { user, logout } = useUser();
  const [view, setView] = useState('home'); // home, parcels, calc, admin
  const [theme, setTheme] = useState('dark');
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [activeParcel, setActiveParcel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [masterConfig, setMasterConfig] = useState(null);
  const [globalPrices, setGlobalPrices] = useState(PRICE_LISTS); // Default fallback
  const [showTenderSummary, setShowTenderSummary] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load Tenders & Global Config
  useEffect(() => {
    const load = async () => {
      try {
        const [tData, cData] = await Promise.all([
          api.getTenders(),
          api.getMyConfig()
        ]);
        setTenders(tData);
        setMasterConfig(cData);
        if (cData?.price_overrides && Object.keys(cData.price_overrides).length > 0) {
           setGlobalPrices(cData.price_overrides);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    load();
  }, []);

  const handleUpdateGlobalPrices = async (newPrices) => {
    setGlobalPrices(newPrices);
    try {
      await api.updateMyConfig({ price_overrides: newPrices });
    } catch (err) {
      console.error("Failed to sync global prices", err);
    }
  };

  const selectTender = (t) => {
    setActiveTender(t);
    setView('parcels');
    setShowTenderSummary(false);
  };

  const selectParcel = (p) => {
    setActiveParcel(p);
    setView('calc');
  };

  const handleCreateTender = async () => {
    const name = prompt("Enter Notebook Name:");
    if (!name) return;
    const date = new Date().toISOString().split('T')[0];
    const newT = await api.createTender({ name, date });
    setTenders([...tenders, { ...newT, parcels: [] }]);
  };

  const handleCreateParcel = async () => {
    const name = prompt("Parcel Name (e.g. BR-101):");
    if (!name) return;
    const newP = await api.createParcel(activeTender.id, {
      number: `P-${Math.floor(Math.random() * 1000)}`,
      name: name,
      parcel_type: "SW",
      total_cts: 100,
      pcs: 0,
      calc_state: { table: {}, yield: 44, labour: 35, strategy: 'Whole' }
    });
    
    // Update local state
    const updatedTender = { ...activeTender, parcels: [...(activeTender.parcels || []), newP] };
    setActiveTender(updatedTender);
    setTenders(tenders.map(t => t.id === activeTender.id ? updatedTender : t));
  };

  const handleShare = async (e, tender) => {
    e.stopPropagation();
    const email = prompt("Enter Colleague\'s Email:");
    if (!email) return;
    const res = await api.shareTender(tender.id, email);
    alert(res.message || res.detail);
  };

  const handleDeleteTender = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this Notebook and all its parcels?")) return;
    try {
      await api.deleteTender(id);
      setTenders(tenders.filter(t => t.id !== id));
      if (activeTender?.id === id) {
        setActiveTender(null);
        setView('home');
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting tender");
    }
  };

  const handleDeleteParcel = async (e, parcelId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this parcel?")) return;
    try {
      await api.deleteParcel(parcelId);
      const updatedParcels = activeTender.parcels.filter(p => p.id !== parcelId);
      const updatedTender = { ...activeTender, parcels: updatedParcels };
      setActiveTender(updatedTender);
      setTenders(tenders.map(t => t.id === activeTender.id ? updatedTender : t));
    } catch (err) {
      console.error(err);
      alert("Error deleting parcel");
    }
  };

  return (
    <div className="dashboard-root">
      <header className="hdr">
        <div className="logo" onClick={() => setView('home')}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/></svg>
          <span>EF DIAMOND ERP</span>
        </div>
        <div className="hdr-divider"></div>
        <div className="breadcrumb">
          <span className="link" onClick={() => setView('home')}>Home</span>
          {activeTender && (
            <>
              <span className="sep">/</span>
              <span className="link" onClick={() => setView('parcels')}>{activeTender.name}</span>
            </>
          )}
          {activeParcel && view === 'calc' && (
            <>
              <span className="sep">/</span>
              <span className="link text-gold">{activeParcel.name}</span>
            </>
          )}
        </div>
        
          <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☼' : '☾'}
          </button>
          {user?.role === 'admin' && (
            <button 
              className="theme-btn" 
              style={{color:'var(--gold)', border:'1px solid var(--gold)'}} 
              title="Admin Panel"
              onClick={() => setView('admin')}
            >
              🛡️
            </button>
          )}
          <button className="theme-btn" style={{color:'#f87171'}} onClick={logout}>⏻</button>
      </header>

      <main className="body">
        {view === 'home' && (
          <div className="home-hero">
            <div className="section-hdr">
              <h2 className="title-glow">Your Purchase Notebooks</h2>
              <button className="btn btn-primary" onClick={handleCreateTender}>+ New Notebook</button>
            </div>
            <div className="grid">
              {tenders.map(t => (
                <div key={t.id} className="home-card glass" onClick={() => selectTender(t)}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                     <div className="badge badge-blue">TENDER</div>
                     <div style={{display:'flex', gap:5}}>
                        <button className="share-btn" title="Share with team" onClick={(e) => handleShare(e, t)}>🤝</button>
                        <button className="share-btn" style={{color:'#f87171'}} title="Delete Notebook" onClick={(e) => handleDeleteTender(e, t.id)}>🗑</button>
                     </div>
                  </div>
                  <h3 style={{marginTop: 10}}>{t.name}</h3>
                  <div className="card-footer">
                    <span>{t.parcels?.length || 0} Parcels</span>
                    <span>{t.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'parcels' && activeTender && (
          <div className="parcel-list">
             <div className="section-hdr">
                <h2>{activeTender.name} <span style={{opacity:0.3, fontSize:14}}>(ID: {activeTender.id})</span></h2>
                 <div style={{display:'flex', gap:10}}>
                    <button className={`btn ${showTenderSummary ? 'btn-gold' : 'btn-outline'}`} onClick={() => setShowTenderSummary(!showTenderSummary)}>
                      {showTenderSummary ? '📊 Show List' : '📋 Notebook Summary'}
                    </button>
                    <button className="btn btn-primary" onClick={handleCreateParcel}>+ New Parcel</button>
                    <button className="btn btn-outline" onClick={() => setView('home')}>← Back</button>
                 </div>
              </div>
              {showTenderSummary ? (
                <TenderSummaryReport tender={activeTender} parcels={activeTender.parcels} prices={globalPrices} />
              ) : (
                <div className="card glass">
                  <table className="ef-table">
                    <thead>
                        <tr>
                          <th># No.</th>
                          <th>Parcel Name</th>
                          <th>Type</th>
                          <th>Total Cts</th>
                          <th>Pcs</th>
                          <th>Created</th>
                          <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTender.parcels?.map(p => (
                          <tr key={p.id}>
                              <td>{p.number}</td>
                              <td className="text-gold">{p.name}</td>
                              <td><span className="pill">{p.parcel_type}</span></td>
                              <td>{p.total_cts}</td>
                              <td>{p.pcs}</td>
                              <td>{new Date(p.created_at).toLocaleDateString()}</td>
                              <td>
                                <button className="btn-sm btn-primary" onClick={() => selectParcel(p)}>Open Calc</button>
                                  <button className="btn-sm btn-outline" style={{borderColor:'#f87171', color:'#f87171', marginLeft:5}} onClick={(e) => handleDeleteParcel(e, p.id)}>Delete</button>
                              </td>
                          </tr>
                        ))}
                        {(!activeTender.parcels || activeTender.parcels.length === 0) && (
                          <tr><td colSpan="7" style={{textAlign:'center', padding:40, opacity:0.5}}>No parcels found in this notebook.</td></tr>
                        )}
                    </tbody>
                  </table>
                </div>
              )}
             </div>
        )}

        {view === 'calc' && activeParcel && (
          <CalculationView 
            tender={activeTender} 
            parcel={activeParcel} 
            globalPrices={globalPrices}
            onUpdateGlobalPrices={handleUpdateGlobalPrices}
            onBack={() => setView('parcels')} 
            onUpdate={(updatedTender) => {
              setActiveTender(updatedTender);
              setTenders(tenders.map(t => t.id === updatedTender.id ? updatedTender : t));
              // Also update activeParcel if it was changed
              const updatedParcel = updatedTender.parcels.find(p => p.id === activeParcel.id);
              if (updatedParcel) setActiveParcel(updatedParcel);
            }}
          />
        )}
        {view === 'admin' && (
          <AdminPanel onBack={() => setView('home')} />
        )}
      </main>
    </div>
  );
}

// Component for IMAGE 3: Price Master (Benchmark Prices)
const PriceMasterView = ({ prices, onUpdate }) => {
  const [activeShape, setActiveShape] = useState("Round");
  const [activeSieve, setActiveSieve] = useState("r1");
  
  const uiShapes = ["Round", "Pear/Oval", "Baguette", "Triangles"];
  const sieves = PRICE_SIEVES;

  const handlePriceChange = (col, clr, val) => {
    const next = { ...prices };
    // Map non-round shapes to 'Fancy' in the backend
    const priceShape = activeShape === "Round" ? "Round" : "Fancy";
    const shapeKey = Object.keys(next).find(k => k.toLowerCase() === priceShape.toLowerCase()) || priceShape;
    
    if (!next[shapeKey]) next[shapeKey] = {};
    if (!next[shapeKey][activeSieve]) next[shapeKey][activeSieve] = {};
    if (!next[shapeKey][activeSieve][col]) next[shapeKey][activeSieve][col] = {};
    next[shapeKey][activeSieve][col][clr] = parseFloat(val) || 0;
    onUpdate(next);
  };

  const handleExcelSync = async () => {
    if (!confirm("Are you sure you want to overwrite all prices with the data from 'PRICE LIST_27_4_2026.xlsx'?")) return;
    try {
       const res = await api.syncPricesFromExcel();
       if (res.status === 'success') {
          const newConfig = await api.getMyConfig();
          onUpdate(newConfig?.price_overrides || res.data);
          alert("Prices synchronized successfully!");
       } else {
          alert("Error: " + (res.detail || "Unknown error"));
       }
    } catch (err) {
       console.error("Sync failed", err);
       alert("Failed to sync from Excel.");
    }
  };

  // Map non-round to 'Fancy' for data lookup
  const lookupShape = activeShape === "Round" ? "Round" : "Fancy";
  const shapeKey = Object.keys(prices).find(k => k.toLowerCase() === lookupShape.toLowerCase());
  const currentGrid = shapeKey ? (prices[shapeKey]?.[activeSieve] || {}) : {};

  return (
    <div className="price-master-inner">
       <div className="shape-tabs" style={{display:'flex', gap:10, marginBottom:15}}>
          {uiShapes.map(s => (
             <button 
                key={s} 
                className={`btn-sm ${activeShape === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveShape(s)}
             >
                {s}
             </button>
          ))}
       </div>
       <div className="sieve-tabs" style={{display:'flex', gap:5, marginBottom:20, overflowX:'auto', paddingBottom:10}}>
          {sieves.map(sv => (
             <button 
                key={sv.id} 
                className={`btn-mini ${activeSieve === sv.id ? 'btn-green' : 'btn-outline'}`}
                onClick={() => setActiveSieve(sv.id)}
                style={{fontSize:10, whiteSpace:'nowrap', padding: '6px 12px', minWidth: 'fit-content'}}
             >
                {sv.label}
             </button>
          ))}
       </div>

       <div className="card glass">
          <div className="card-hdr" style={{display:'flex', justifyContent:'space-between'}}>
             <span>{activeShape.toUpperCase()} — {activeSieve.toUpperCase()} Price Grid</span>
             <button 
                className="btn-mini btn-outline" 
                onClick={handleExcelSync}
                style={{borderColor:'#fbbf24', color:'#fbbf24'}}
             >
                🔄 Sync from Excel
             </button>
          </div>
          <table className="ef-table-excel">
             <thead>
                <tr>
                   <th>COLOR</th>
                   {CLARITY_LIST.map(c => <th key={c}>{c}</th>)}
                </tr>
             </thead>
             <tbody>
                {COLOUR_LIST.map(col => (
                   <tr key={col}>
                      <td style={{fontWeight:800, background:'rgba(255,255,255,0.05)'}}>{col}</td>
                      {CLARITY_LIST.map(clr => (
                         <td key={clr}>
                            <input 
                              className="cell-input" 
                              style={{textAlign:'center', background:'transparent', border:'none', color:'#fff', width:'100%'}}
                              value={currentGrid[col]?.[clr] !== undefined ? Number(currentGrid[col][clr]).toFixed(2) : ""}
                              onChange={e => handlePriceChange(col, clr, e.target.value)}
                            />
                         </td>
                      ))}
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

// Component to replicate the Excel-style notebook profile from your image
const TenderProfileHeader = ({ tender, parcel, onParcelUpdate, onTenderUpdate }) => {
  const avgSize = (parcel.total_cts && parcel.pcs) ? (parcel.total_cts / parcel.pcs).toFixed(4) : "0.0000";

  return (
    <div className="tender-profile-wrap">
       <table className="profile-table">
          <tbody>
             <tr><td>Viewing Date</td><td><input type="date" className="cell-input" style={{color:'#fbbf24', fontWeight:700}} value={tender.viewing_date || ''} onChange={e => onTenderUpdate('viewing_date', e.target.value)} /></td></tr>
             <tr><td>Tender Name</td><td><input className="cell-input" style={{color:'#fff'}} value={tender.name || ''} onChange={e => onTenderUpdate('name', e.target.value)} /></td></tr>
             <tr><td>Parcel Number</td><td><input className="cell-input" style={{color:'#fff'}} value={parcel.number || ''} onChange={e => onParcelUpdate('number', e.target.value)} /></td></tr>
             <tr><td>Parcel Name</td><td><input className="cell-input" style={{color:'#fff'}} value={parcel.name || ''} onChange={e => onParcelUpdate('name', e.target.value)} /></td></tr>
             <tr><td>Total Cts</td><td><NumericInput value={parcel.total_cts} onChange={v => onParcelUpdate('total_cts', v)} /></td></tr>
             <tr><td>Pcs</td><td><NumericInput value={parcel.pcs} onChange={v => onParcelUpdate('pcs', v)} /></td></tr>
             <tr><td>Average Size</td><td>{avgSize}</td></tr>
             <tr><td>Last Sold Price</td><td><NumericInput value={parcel.last_sold_price} onChange={v => onParcelUpdate('last_sold_price', v)} /></td></tr>
             <tr><td>Profit Margin %</td><td><NumericInput value={parcel.profit_margin || 0} onChange={v => onParcelUpdate('profit_margin', v)} /></td></tr>
             <tr className="bid-row"><td>Bid Price Per Ct</td><td><NumericInput value={parcel.bid_price_per_ct} onChange={v => onParcelUpdate('bid_price_per_ct', v)} /></td></tr>
          </tbody>
       </table>
    </div>
  );
};

// Component for IMAGE 1: Rough Assortment Input
const AssortmentTable = ({ range, state, onValueChange, onSampleChange, onUpdateConfig }) => {
  const target = state.sizeProfile?.[range] || { cts: 0, avg: 0 };
  const targetCts = parseFloat(target.cts) || 0;
  const targetPcs = target.avg > 0 ? Math.round(targetCts / target.avg) : 0;

  const sample = state.sampleConfig?.[range] || { pcs: 0, cts: 0 };
  const scaleFactor = (targetCts > 0 && sample.cts > 0) ? (targetCts / sample.cts) : 1;

  const rangeCfg = state.rangeConfig?.[range] || {};
  const selectedShapes = rangeCfg.selectedShapes || ["Round"];
  const availableShapes = ["Round", "Pear/Oval", "Baguette", "Triangles"];

  const toggleShape = (shape) => {
    let next = [...selectedShapes];
    if (next.includes(shape)) {
      if (next.length > 1) next = next.filter(s => s !== shape);
    } else {
      next.push(shape);
    }
    onUpdateConfig(range, 'selectedShapes', next);
  };

  return (
    <div className="card glass category-card" style={{marginBottom: 24}}>
        <div className="card-hdr" style={{background:'#1e3a8a', color:'#fff', borderBottom:'2px solid #2563eb'}}>
           <span style={{fontSize:16, fontWeight:800}}>Rough Assortment: {range}</span>
           <div style={{display:'flex', gap:20, fontSize:12, fontWeight:600}}>
               <span>Target: <b className="text-gold">{targetCts} cts</b> / <b>{targetPcs} pcs</b></span>
               <div style={{display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.1)', padding:'2px 10px', borderRadius:4}}>
                  <span>Sample:</span>
                  <input 
                    className="cell-input" 
                    style={{width:60, borderBottom:'1px solid #fff', color:'#fff'}} 
                    value={sample.pcs || ""} 
                    onChange={e => onSampleChange(range, 'pcs', e.target.value)} 
                    placeholder="Pcs"
                  />
                  <input 
                    className="cell-input" 
                    style={{width:60, borderBottom:'1px solid #fff', color:'#fff'}} 
                    value={sample.cts || ""} 
                    onChange={e => onSampleChange(range, 'cts', e.target.value)} 
                    placeholder="Cts"
                  />
               </div>
               <span style={{opacity:0.8}}>Scale: <b className="text-gold">x{scaleFactor.toFixed(2)}</b></span>
           </div>
        </div>

        <div className="shape-selector-bar" style={{padding:'8px 15px', background:'rgba(255,255,255,0.05)', display:'flex', gap:20, alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
           <span style={{fontSize:11, fontWeight:700, opacity:0.6}}>POLISHED SHAPES:</span>
           {availableShapes.map(s => (
              <label key={s} style={{display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer'}}>
                 <input type="checkbox" checked={selectedShapes.includes(s)} onChange={() => toggleShape(s)} />
                 {s}
              </label>
           ))}
        </div>

        <div className="overflow-x">
           <table className="ef-table-excel">
              <thead>
                 <tr>
                    <th rowSpan="2" style={{width:80}}>Assortment</th>
                    <th rowSpan="2" style={{width:100}}>Shape</th>
                    {CLARITY_LIST.map(c => <th key={c} colSpan="4" style={{fontSize:9, background:'var(--bg2)'}}>{c}</th>)}
                    <th colSpan="2" style={{background:'#1e3a8a', color:'#fff'}}>Sample Total</th>
                    <th colSpan="2" style={{background:'var(--card2)', color:'var(--gold)'}}>Whole Total</th>
                 </tr>
                 <tr>
                    {CLARITY_LIST.map(c => <React.Fragment key={c}>
                       <th title="Sample Pcs">S-P</th><th title="Sample Cts">S-C</th>
                       <th title="Whole Pcs" style={{color:'var(--gold)'}}>W-P</th><th title="Whole Cts" style={{color:'var(--gold)'}}>W-C</th>
                    </React.Fragment>)}
                    <th style={{background:'#1e3a8a', color:'#fff'}}>PCS</th>
                    <th style={{background:'#1e3a8a', color:'#fff'}}>CTS</th>
                    <th style={{background:'var(--card2)', color:'var(--gold)'}}>PCS</th>
                    <th style={{background:'var(--card2)', color:'var(--gold)'}}>CTS</th>
                 </tr>
              </thead>
              <tbody>
                 {COLOUR_LIST.map(colour => (
                    <React.Fragment key={colour}>
                       {selectedShapes.map((shape, sIdx) => {
                          let sP = 0; let sC = 0;
                          return (
                             <tr key={`${colour}-${shape}`}>
                                {sIdx === 0 && <td rowSpan={selectedShapes.length} className="rng-cell" style={{verticalAlign:'middle', background:'rgba(255,255,255,0.02)'}}>{colour}</td>}
                                <td style={{fontSize:11, fontWeight:600, opacity:0.8}}>{shape}</td>
                                {CLARITY_LIST.map(clarity => {
                                   const p = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
                                   const c = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
                                   const wP = Math.round(p * scaleFactor);
                                   const wC = c * scaleFactor;
                                   sP += p; sC += c;
                                   return (
                                      <React.Fragment key={clarity}>
                                         <td><input className="cell-input" value={state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs || ""} onChange={e => onValueChange(range, colour, clarity, 'pcs', e.target.value, shape)} /></td>
                                         <td><input className="cell-input" value={state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts || ""} onChange={e => onValueChange(range, colour, clarity, 'cts', e.target.value, shape)} /></td>
                                         <td style={{background:'rgba(255,255,255,0.03)', color:'var(--text3)'}}>{wP || ""}</td>
                                         <td style={{background:'rgba(255,255,255,0.03)', color:'var(--text3)'}}>{wC.toFixed(2) || ""}</td>
                                      </React.Fragment>
                                   );
                                })}
                                <td className="row-total">{sP}</td>
                                <td className="row-total">{sC.toFixed(2)}</td>
                                <td className="row-total" style={{color:'var(--gold)'}}>{Math.round(sP * scaleFactor)}</td>
                                <td className="row-total" style={{color:'var(--gold)'}}>{(sC * scaleFactor).toFixed(2)}</td>
                             </tr>
                          );
                       })}
                    </React.Fragment>
                 ))}
                  {(() => {
                     let gSP = 0; let gSC = 0; let gWP = 0; let gWC = 0;
                     const clarityTotals = {};
                     CLARITY_LIST.forEach(cl => clarityTotals[cl] = { p: 0, c: 0, wp: 0, wc: 0 });

                     COLOUR_LIST.forEach(colour => {
                        selectedShapes.forEach(shape => {
                           CLARITY_LIST.forEach(clarity => {
                              const p = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
                              const c = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
                              clarityTotals[clarity].p += p;
                              clarityTotals[clarity].c += c;
                              clarityTotals[clarity].wp += Math.round(p * scaleFactor);
                              clarityTotals[clarity].wc += (c * scaleFactor);
                              gSP += p; gSC += c;
                           });
                        });
                     });
                     gWP = Math.round(gSP * scaleFactor);
                     gWC = gSC * scaleFactor;

                     return (
                        <tr style={{fontWeight:800, background:'rgba(30,58,138,0.2)'}}>
                           <td colSpan={2} className="rng-cell" style={{color:'#fff'}}>TOTAL</td>
                           {CLARITY_LIST.map(clarity => (
                              <React.Fragment key={clarity}>
                                 <td style={{color:'var(--text2)'}}>{clarityTotals[clarity].p || "0"}</td>
                                 <td style={{color:'var(--text2)'}}>{clarityTotals[clarity].c.toFixed(2) || "0.00"}</td>
                                 <td style={{color:'var(--text3)', background:'rgba(255,255,255,0.02)'}}>{clarityTotals[clarity].wp || "0"}</td>
                                 <td style={{color:'var(--text3)', background:'rgba(255,255,255,0.02)'}}>{clarityTotals[clarity].wc.toFixed(2) || "0.00"}</td>
                              </React.Fragment>
                           ))}
                           <td className="row-total" style={{background:'#1e3a8a', color:'#fff'}}>{gSP}</td>
                           <td className="row-total" style={{background:'#1e3a8a', color:'#fff'}}>{gSC.toFixed(2)}</td>
                           <td className="row-total" style={{background:'var(--card2)', color:'var(--gold)'}}>{gWP}</td>
                           <td className="row-total" style={{background:'var(--card2)', color:'var(--gold)'}}>{gWC.toFixed(2)}</td>
                        </tr>
                     );
                  })()}
               </tbody>
           </table>
        </div>
    </div>
  );
};

// Component for IMAGE 2: Polish Calculation
const PolishTable = ({ range, state, prices, onUpdateConfig, onGlobalUpdate, sizeChart }) => {
  const rangeCfg = state.rangeConfig?.[range] || { yield: 44, labour: 35, profit: 15, multiplier: 1 };
  const yieldPct = parseFloat(state.yield) || 44; // Use global yield
  const multiplier = parseFloat(rangeCfg.multiplier) || (state.strategy === 'Whole' ? 1 : 2);
  const selectedShapes = rangeCfg.selectedShapes || ["Round"];
  
  const target = state.sizeProfile?.[range] || { cts: 0, avg: 0 };
  const targetCts = parseFloat(target.cts) || 0;

  let sampleTotalCts = 0;
  let sampleTotalPcs = 0;
  COLOUR_LIST.forEach(col => {
    selectedShapes.forEach(shape => {
      CLARITY_LIST.forEach(clr => {
        sampleTotalCts += parseFloat(state.table?.[range]?.[col]?.[shape]?.[clr]?.cts) || 0;
        sampleTotalPcs += parseFloat(state.table?.[range]?.[col]?.[shape]?.[clr]?.pcs) || 0;
      });
    });
  });
  
  const rangeScaleFactor = (targetCts > 0 && sampleTotalCts > 0) ? (targetCts / sampleTotalCts) : 1;

  // AUTOMATED SIZE LOOKUP
  let totalP = 0; let totalC = 0;
  COLOUR_LIST.forEach(colour => {
     selectedShapes.forEach(shape => {
        CLARITY_LIST.forEach(clarity => {
           const roughC_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
           const roughP_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
           totalP += Math.round((roughP_sample * rangeScaleFactor) * multiplier);
           totalC += (roughC_sample * rangeScaleFactor) * (yieldPct / 100);
        });
     });
  });
  
  const autoAvgSize = totalP > 0 ? (totalC / totalP) : 0;
  const pIdx = getPriceIdxByWeight(autoAvgSize);
  const polMM = getMMBySieveAndWeight(range, autoAvgSize, sizeChart);
  
  return (
    <div className="card glass category-card" style={{marginBottom: 24}}>
       <div className="card-hdr" style={{background:'#16a34a', color:'#fff', borderBottom:'2px solid #15803d', padding:'10px 15px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
             <span style={{fontSize:18, fontWeight:900, textShadow:'0 2px 4px rgba(0,0,0,0.2)'}}>Polish Calculation: {range}</span>
             
             <div className="header-params" style={{display:'flex', gap:20, alignItems:'center'}}>
                <div className="param-item">
                   <label style={{fontSize:10, textTransform:'uppercase', opacity:0.8, display:'block'}}>Avg Yield %</label>
                   <input className="hdr-input" value={state.yield || ""} onChange={e => onGlobalUpdate('yield', e.target.value)} />
                </div>
                <div className="param-item">
                   <label style={{fontSize:10, textTransform:'uppercase', opacity:0.8, display:'block'}}>Stone Multiplier</label>
                   <input className="hdr-input" value={rangeCfg.multiplier || ""} onChange={e => onUpdateConfig(range, 'multiplier', e.target.value)} />
                </div>
                <div className="param-item">
                   <label style={{fontSize:10, textTransform:'uppercase', opacity:0.8, display:'block'}}>POL MM</label>
                   <div className="auto-val" style={{color:'#fff', fontWeight:800}}>{polMM}</div>
                </div>
                <div className="param-item">
                   <label style={{fontSize:10, textTransform:'uppercase', opacity:0.8, display:'block'}}>Avg Pol Size</label>
                   <div className="auto-val">{autoAvgSize.toFixed(4)}</div>
                </div>
                <div className="param-item" style={{borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:15}}>
                   <label style={{fontSize:10, textTransform:'uppercase', opacity:0.8, display:'block'}}>Price Range</label>
                   <b style={{fontSize:14, color:'var(--gold)'}}>{pIdx.toUpperCase()}</b>
                </div>
             </div>
          </div>
       </div>
       <div className="overflow-x">
          <table className="ef-table-excel">
             <thead>
                <tr>
                   <th rowSpan="2" style={{width:80}}>Assortment</th>
                   <th rowSpan="2" style={{width:100}}>Shape</th>
                   {CLARITY_LIST.map(c => <th key={c} colSpan="4">{c}</th>)}
                   <th colSpan="3" style={{background:'#166534', color:'#fff'}}>Total</th>
                </tr>
                <tr>
                   {CLARITY_LIST.map(c => <React.Fragment key={c}><th>PCS</th><th>CTS</th><th>$/CT</th><th>TOTAL</th></React.Fragment>)}
                   <th>PCS</th><th>CTS</th><th>TOTAL</th>
                </tr>
             </thead>
             <tbody>
                {COLOUR_LIST.map(colour => (
                   <React.Fragment key={colour}>
                      {selectedShapes.map((shape, sIdx) => {
                         let rowP = 0; let rowC = 0; let rowV = 0;
                         return (
                            <tr key={`${colour}-${shape}`}>
                               {sIdx === 0 && <td rowSpan={selectedShapes.length} className="rng-cell" style={{verticalAlign:'middle'}}>{colour}</td>}
                               <td style={{fontSize:11, fontWeight:600, opacity:0.8}}>{shape}</td>
                               {CLARITY_LIST.map(clarity => {
                                  const roughP_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
                                  const roughC_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
                                  
                                  const roughC = roughC_sample * rangeScaleFactor;
                                  const polP = Math.round((roughP_sample * rangeScaleFactor) * multiplier);
                                  const polC = parseFloat((roughC * (yieldPct / 100)).toFixed(2));
                                  
                                  const priceShape = shape === "Round" ? "Round" : "Fancy";
                                  const price = prices?.[priceShape]?.[pIdx]?.[colour]?.[clarity] || 0;
                                  
                                  const totalVal = polC * price;
                                  rowP += polP; rowC += polC; rowV += totalVal;
                                  return (
                                     <React.Fragment key={clarity}>
                                        <td>{polP || ""}</td>
                                        <td>{polC.toFixed(2) || ""}</td>
                                        <td>{price || ""}</td>
                                        <td className="text-gold">{totalVal.toFixed(2) || ""}</td>
                                     </React.Fragment>
                                  );
                               })}
                               <td className="row-total">{rowP}</td>
                               <td className="row-total">{rowC.toFixed(2)}</td>
                                <td className="row-total text-green">${rowV.toFixed(2)}</td>
                             </tr>
                         );
                      })}
                   </React.Fragment>
                ))}
                  {(() => {
                     let gP = 0; let gC = 0; let gV = 0;
                     const clarityTotals = {};
                     CLARITY_LIST.forEach(cl => clarityTotals[cl] = { p: 0, c: 0, v: 0 });

                     COLOUR_LIST.forEach(colour => {
                        selectedShapes.forEach(shape => {
                           CLARITY_LIST.forEach(clarity => {
                              const roughP_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
                              const roughC_sample = parseFloat(state.table?.[range]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
                              const roughC = roughC_sample * rangeScaleFactor;
                              const polP = Math.round((roughP_sample * rangeScaleFactor) * multiplier);
                              const polC = parseFloat((roughC * (yieldPct / 100)).toFixed(2));
                              
                              const priceShape = shape === "Round" ? "Round" : "Fancy";
                              const price = prices?.[priceShape]?.[pIdx]?.[colour]?.[clarity] || 0;
                              const v = polC * price;
                              
                              clarityTotals[clarity].p += polP;
                              clarityTotals[clarity].c += polC;
                              clarityTotals[clarity].v += v;
                              gP += polP; gC += polC; gV += v;
                           });
                        });
                     });

                     return (
                        <tr style={{fontWeight:800, background:'rgba(22,101,52,0.2)'}}>
                           <td colSpan={2} className="rng-cell" style={{color:'#166534'}}>TOTAL</td>
                           {CLARITY_LIST.map(clarity => (
                              <React.Fragment key={clarity}>
                                 <td>{clarityTotals[clarity].p || "0"}</td>
                                 <td>{clarityTotals[clarity].c.toFixed(2) || "0.00"}</td>
                                 <td style={{background:'rgba(255,255,255,0.02)', opacity:0.5}}>-</td>
                                 <td className="text-gold">{clarityTotals[clarity].v.toFixed(2) || "0.00"}</td>
                              </React.Fragment>
                           ))}
                           <td className="row-total" style={{background:'#166534', color:'#fff'}}>{gP}</td>
                           <td className="row-total" style={{background:'#166534', color:'#fff'}}>{gC.toFixed(2)}</td>
                           <td className="row-total text-green" style={{background:'#166534', color:'#fff', fontSize:14}}>${gV.toFixed(2)}</td>
                        </tr>
                     );
                  })()}
               </tbody>
          </table>
       </div>
    </div>
  );
};

// COMPONENT: Size Chart View (Editable Master Table)
const SizeChartView = ({ chart, onUpdate }) => {
  const handleChange = (id, field, val) => {
    const next = chart.map(row => row.id === id ? { ...row, [field]: val } : row);
    onUpdate(next);
  };

  const handleAdd = () => {
    const newId = chart.length > 0 ? Math.max(...chart.map(r => r.id)) + 1 : 1;
    const next = [...chart, { id: newId, ratio: "New", sieve: "", weight: "", mm: "" }];
    onUpdate(next);
  };

  const handleDelete = (id) => {
    if (!confirm("Remove this ratio from Master Chart?")) return;
    const next = chart.filter(r => r.id !== id);
    onUpdate(next);
  };

  return (
    <div className="card glass size-chart-view" style={{marginTop: 24}}>
       <div className="section-hdr" style={{background:'#1e293b', color:'#fff', padding:'10px 15px', borderRadius:'8px 8px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
             <h2 className="title-glow" style={{margin:0}}>Master Size Chart (MM Lookup Table)</h2>
             <p style={{fontSize:11, opacity:0.6, margin:0}}>Automatic Polished MM lookups are based on this table.</p>
          </div>
          <button className="btn-sm btn-primary" onClick={handleAdd}>+ Add New Ratio</button>
       </div>
       <table className="ef-table-excel">
          <thead>
             <tr>
                <th style={{width:80}}>Ratio</th>
                <th>Sieve Size</th>
                <th>Weight (Ct)</th>
                <th>DIA (mm)</th>
                <th style={{width:40}}></th>
             </tr>
          </thead>
          <tbody>
             {chart.map(row => (
                <tr key={row.id}>
                   <td className="rng-cell" style={{fontWeight:700}}><input className="cell-input" value={row.ratio} onChange={e => handleChange(row.id, 'ratio', e.target.value)} /></td>
                   <td><input className="cell-input" style={{fontSize:11}} value={row.sieve} onChange={e => handleChange(row.id, 'sieve', e.target.value)} /></td>
                   <td><input className="cell-input" style={{textAlign:'center', color:'var(--gold)'}} value={row.weight} onChange={e => handleChange(row.id, 'weight', e.target.value)} /></td>
                   <td style={{background:'rgba(255,255,255,0.03)'}}><input className="cell-input" style={{fontWeight:700, textAlign:'center'}} value={row.mm} onChange={e => handleChange(row.id, 'mm', e.target.value)} /></td>
                   <td>
                      <button className="btn-del-mini" onClick={() => handleDelete(row.id)}>×</button>
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
};

const SizeProfileTable = ({ state, onAddRange, onDeleteRange, onUpdateRange, totals }) => {
  const ranges = state.ranges || [];
  const profile = state.sizeProfile || {};

  const rangeSummaries = ranges.map(r => {
    const data = profile[r] || { cts: 0, avg: 0 };
    const cts = parseFloat(data.cts) || 0;
    const avg = parseFloat(data.avg) || 0;
    const pcs = avg > 0 ? Math.round(cts / avg) : 0;
    return { name: r, cts, avg, pcs };
  });

  const totalRoughCts = rangeSummaries.reduce((s, r) => s + r.cts, 0);
  const totalPcs = rangeSummaries.reduce((s, r) => s + r.pcs, 0);
  
  // Use actual totals from Polish Tab if available, otherwise estimate
  const displayPolCts = totals.totalCts > 0 ? totals.totalCts : (totalRoughCts * (state.yield / 100));
  const displayYield = totalRoughCts > 0 ? (displayPolCts / totalRoughCts) * 100 : state.yield;
  const totalAvgSize = totalPcs > 0 ? (totalRoughCts / totalPcs) : 0;

  return (
    <div className="card glass size-profile-card" style={{marginTop: 24}}>
       <div className="card-hdr" style={{background:'#1e293b', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span>Total CTs Size Profile</span>
          <button className="btn-sm btn-primary" onClick={() => {
             const name = prompt("Enter Sieve Range (e.g. -7+5):");
             if (name) onAddRange(name);
          }}>+ Add Category</button>
       </div>
       <table className="ef-table-excel">
          <thead>
             <tr>
                <th style={{width:100}}>SIZE</th>
                <th>CTS</th>
                <th style={{width:60}}>%</th>
                <th>AVG SIZE</th>
                <th>PCS</th>
                <th style={{width:40}}></th>
             </tr>
          </thead>
          <tbody>
             {rangeSummaries.map(r => (
                <tr key={r.name}>
                   <td className="rng-cell">{r.name}</td>
                   <td>
                      <input 
                        className="cell-input" 
                        style={{color:'#fff', fontWeight:700, fontSize:14}}
                        value={profile[r.name]?.cts || ""} 
                        onChange={e => onUpdateRange(r.name, 'cts', e.target.value)} 
                        placeholder="0.0"
                      />
                   </td>
                   <td style={{color:'var(--text3)'}}>{totalRoughCts > 0 ? ((r.cts / totalRoughCts) * 100).toFixed(1) : 0}%</td>
                   <td>
                      <input 
                        className="cell-input" 
                        style={{color:'#fff', fontSize:14}}
                        value={profile[r.name]?.avg || ""} 
                        onChange={e => onUpdateRange(r.name, 'avg', e.target.value)} 
                        placeholder="0.0000"
                      />
                   </td>
                   <td style={{fontWeight:700, color:'var(--text2)', fontSize:14}}>{r.pcs}</td>
                   <td>
                      <button className="btn-del-mini" onClick={() => onDeleteRange(r.name)}>×</button>
                   </td>
                </tr>
             ))}
             {ranges.length === 0 && (
                <tr><td colSpan={6} style={{padding:20, opacity:0.5, textAlign:'center'}}>No categories added. Click "+ Add Category" above.</td></tr>
             )}
             <tr style={{fontWeight:800, background:'rgba(255,255,255,0.05)'}}>
                <td>Total Rough Cts</td>
                <td style={{fontSize:16}}>{formatNum(totalRoughCts, 2)}</td>
                <td></td>
                <td style={{fontSize:16}}>{totalAvgSize.toFixed(4)}</td>
                <td style={{fontSize:16}}>{totalPcs}</td>
                <td></td>
             </tr>
             <tr style={{fontWeight:800}}>
                <td>Total Pol Cts</td>
                <td style={{fontSize:16}}>{formatNum(displayPolCts, 2)}</td>
                <td colSpan={4}></td>
             </tr>
             <tr style={{fontWeight:800}}>
                <td>Yield</td>
                <td style={{fontSize:16}}>{displayYield.toFixed(1)}%</td>
                <td colSpan={2}></td>
                <td style={{border:'1px solid var(--gold)', color:'var(--gold)', fontSize:16}}>{formatNum(totalAvgSize, 3)}</td>
                <td></td>
             </tr>
          </tbody>
       </table>
    </div>
  );
};

// NEW COMPONENT: Fluorescence (Fluo) Profile
const FluoProfileTable = ({ totalWeight, totalPcs, fluoState, onUpdate }) => {
  const categories = ["None", "Fnt", "Med/Stg"];
  const totalPct = categories.reduce((s, cat) => s + (parseFloat(fluoState[cat]) || 0), 0);
  
  return (
    <div className="card glass fluo-profile-card" style={{marginTop: 24}}>
       <div className="card-hdr" style={{background:'#0f172a', color:'#fff'}}>Fluorescence Profile</div>
       <table className="ef-table-excel">
          <thead>
             <tr>
                <th style={{width:100}}>FLUO</th>
                <th>CTS</th>
                <th>PCS</th>
                <th style={{width:60}}>%</th>
             </tr>
          </thead>
          <tbody>
             {categories.map(cat => {
                const pct = parseFloat(fluoState[cat]) || 0;
                const cts = totalWeight * (pct / 100);
                const pcs = Math.round(totalPcs * (pct / 100));
                return (
                   <tr key={cat}>
                      <td className="rng-cell" style={{fontWeight:700}}>{cat}</td>
                      <td style={{background:'rgba(255,255,255,0.03)', color:'var(--text2)'}}>{formatNum(cts, 2)}</td>
                      <td style={{color:'var(--text3)'}}>{pcs}</td>
                      <td>
                         <input 
                           className="cell-input" 
                           style={{textAlign:'center', color:'var(--gold)', fontWeight:700}}
                           value={fluoState[cat] || ""} 
                           onChange={e => onUpdate(cat, e.target.value)} 
                         />
                      </td>
                   </tr>
                );
             })}
             <tr style={{fontWeight:800, background:'rgba(255,255,255,0.05)'}}>
                <td>Total</td>
                <td style={{color:'var(--text2)'}}>{formatNum(totalWeight, 2)}</td>
                <td style={{color:'var(--text3)'}}>{totalPcs}</td>
                <td style={{color: totalPct === 100 ? 'var(--green)' : 'var(--red)'}}>{totalPct}%</td>
             </tr>
          </tbody>
       </table>
    </div>
  );
};

function CalculationView({ tender, parcel, onBack, onUpdate, globalPrices, onUpdateGlobalPrices }) {
  const [activeTab, setActiveTab] = useState('parcel_input'); // parcel_input, assortment, polish, prices, summary
  const [state, setState] = useState({
    table: {},
    rangeConfig: {}, // Store per-range yield, labour, profit, multiplier, etc.
    strategy: 'Whole',
    activeShape: 'Round', // New
    sizeProfile: {}, 
    sampleConfig: {}, 
    fluo: { "None": 95, "Fnt": 0, "Med/Stg": 5 },
    prices: globalPrices,
    extrapolate: true, 
    totalRoughWeight: 100, 
    sampleWeight: 10, 
    ranges: [], 
    sizeChart: MASTER_SIZE_CHART,
    ...parcel.calc_state
  });
  
  const [parcelData, setParcelData] = useState(parcel);
  const [tenderData, setTenderData] = useState(tender);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState(parcel.media || []);

  // Sync Global Prices to local state if they change externally
  useEffect(() => {
    setState(prev => ({ ...prev, prices: globalPrices }));
  }, [globalPrices]);

  // MASTER TOTALS FOR SIEVE RANGES
  const sieveTotals = useMemo(() => {
    const ranges = state.ranges || [];
    const profile = state.sizeProfile || {};
    let cts = 0; let pcs = 0;
    ranges.forEach(r => {
      const r_cts = parseFloat(profile[r]?.cts) || 0;
      const r_avg = parseFloat(profile[r]?.avg) || 0;
      const r_pcs = r_avg > 0 ? Math.round(r_cts / r_avg) : 0;
      cts += r_cts;
      pcs += r_pcs;
    });
    return { cts, pcs };
  }, [state.ranges, state.sizeProfile]);

  // GRAND TOTALS ACROSS ALL TABLES
  const totals = useMemo(() => {
    let totalCts = 0;
    let totalValue = 0;
    let hotCts = 0;
    
    // Global scaling factor
    const scaleFactor = (state.totalRoughWeight > 0 && state.sampleWeight > 0) 
       ? (state.totalRoughWeight / state.sampleWeight) : 1;

    (state.ranges || []).forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0, avg: 0 };
      const targetCts = parseFloat(target.cts) || 0;
      
      const rCfg = state.rangeConfig?.[r] || {};
      const selectedShapes = rCfg.selectedShapes || ["Round"];
      const rYield = parseFloat(state.yield) || 44; // Use GLOBAL yield

      let rSampleCts = 0;
      let rSamplePcs = 0;
      COLOUR_LIST.forEach(col => {
        selectedShapes.forEach(shape => {
          CLARITY_LIST.forEach(clr => {
            const cts = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
            const pcs = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
            rSampleCts += cts;
            rSamplePcs += pcs;
          });
        });
      });

      const rangeScaleFactor = (targetCts > 0 && rSampleCts > 0) ? (targetCts / rSampleCts) : 1;
      
      // Calculate dynamic category-wide avg pol size to find the price index
      const multiplier = parseFloat(rCfg.multiplier) || (state.strategy === 'Whole' ? 1 : 2);
      const polCts = rSampleCts * rangeScaleFactor * (rYield / 100);
      const polPcs = Math.round((rSamplePcs * rangeScaleFactor) * multiplier);
      const avgPolSize = polPcs > 0 ? (polCts / polPcs) : 0;
      const pIdx = getPriceIdxByWeight(avgPolSize);

      COLOUR_LIST.forEach(col => {
        selectedShapes.forEach(shape => {
           CLARITY_LIST.forEach(clr => {
              const sCts = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
              const roughC = sCts * rangeScaleFactor; 
              const polC = parseFloat((roughC * (rYield / 100)).toFixed(2));
              
              const priceShape = shape === "Round" ? "Round" : "Fancy";
              const price = globalPrices?.[priceShape]?.[pIdx]?.[col]?.[clr] || 0;
              
              totalCts += polC;
              totalValue += polC * price;
              if (isHotSize(col, clr)) hotCts += polC;
           });
        });
      });
    });

    return { totalCts, totalValue, hotCts, scaleFactor };
  }, [state, globalPrices]);

  const handleValueChange = (range, colour, clarity, field, val, shape) => {
    const newTable = { ...state.table };
    if (!newTable[range]) newTable[range] = {};
    if (!newTable[range][colour]) newTable[range][colour] = {};
    if (!newTable[range][colour][shape]) newTable[range][colour][shape] = {};
    if (!newTable[range][colour][shape][clarity]) newTable[range][colour][shape][clarity] = {};
    newTable[range][colour][shape][clarity][field] = val;
    setState({ ...state, table: newTable });
  };

  const handleSampleChange = (range, field, val) => {
    const next = { ...state.sampleConfig };
    if (!next[range]) next[range] = { pcs: 0, cts: 0 };
    next[range][field] = val;
    setState({ ...state, sampleConfig: next });
  };

  const handleConfigChange = (range, field, val) => {
    const next = { ...state.rangeConfig };
    if (!next[range]) next[range] = { yield: 44, labour: 35, profit: 15, multiplier: 1, selectedShapes: ["Round"] };
    next[range][field] = val;
    setState({ ...state, rangeConfig: next });
  };

  const deleteRange = (range) => {
    if (!confirm(`Delete all data for ${range}?`)) return;
    const newRanges = state.ranges.filter(r => r !== range);
    const newTable = { ...state.table };
    delete newTable[range];
    setState({ ...state, ranges: newRanges, table: newTable });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Extract only relevant update fields
      const parcelUpdate = {
        name: parcelData.name,
        number: parcelData.number,
        total_cts: parcelData.total_cts,
        pcs: parcelData.pcs,
        last_sold_price: parcelData.last_sold_price,
        bid_price_per_ct: parcelData.bid_price_per_ct,
        profit_margin: parcelData.profit_margin,
        calc_state: state
      };

      const tenderUpdate = {
        name: tenderData.name,
        viewing_date: tenderData.viewing_date
      };

      const [savedParcel, savedTender] = await Promise.all([
        api.updateParcel(parcel.id, parcelUpdate),
        api.updateTender(tender.id, tenderUpdate)
      ]);
      
      // Update parent state with the fresh data from server
      onUpdate({ ...savedTender, parcels: tender.parcels.map(p => p.id === savedParcel.id ? savedParcel : p) });

      alert("✅ Data Saved Successfully!");
    } catch (err) {
      console.error("Save failed", err);
      alert("❌ Save failed. Please check your connection.");
    }
    setSaving(false);
  };

  return (
    <div className="calc-container">
       <div className="calc-hdr">
          <div className="calc-info">
             <h1>{parcelData.name}</h1>
             <p className="text-gold">Notebook: {tenderData.name} | Parcel: {parcelData.number}</p>
          </div>
          <div className="calc-tabs">
             <button className={`tab-btn ${activeTab === 'parcel_input' ? 'active' : ''}`} onClick={() => setActiveTab('parcel_input')}>Parcel Input</button>
             <button className={`tab-btn ${activeTab === 'assortment' ? 'active' : ''}`} onClick={() => setActiveTab('assortment')}>Assortment</button>
             <button className={`tab-btn ${activeTab === 'polish' ? 'active' : ''}`} onClick={() => setActiveTab('polish')}>Polish Calc</button>
             <button className={`tab-btn ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>Price Master</button>
             <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button>
             <button className={`tab-btn ${activeTab === 'size_chart' ? 'active' : ''}`} onClick={() => setActiveTab('size_chart')}>Size Chart</button>
          </div>
          <div className="calc-actions">
             <button className="btn btn-green" onClick={handleSave}>{saving ? '...' : 'Save Data'}</button>
             <button className="btn btn-outline" onClick={onBack}>Close</button>
          </div>
       </div>

        <div className="calc-grid">
          <div className="calc-sidebar">
             <FinalValuationTable 
                totals={totals} 
                parcelData={parcelData} 
                state={state} 
                onUpdate={(field, val) => setState({...state, [field]: val})}
             />
             
             <div className="card glass">
                <div className="card-hdr">Sample Extrapolation</div>
                <div className="card-body">
                   <div className="input-group" style={{flexDirection:'row', justifyContent:'space-between', marginBottom:15}}>
                      <label>Mode: <b>{state.extrapolate ? 'Scaling ON' : 'Manual'}</b></label>
                      <button className={`btn-sm ${state.extrapolate ? 'btn-green' : 'btn-outline'}`} onClick={() => setState({...state, extrapolate: !state.extrapolate})}>
                         Toggle
                      </button>
                   </div>
                   {state.extrapolate && (
                      <div className="scaling-inputs" style={{background:'rgba(255,255,255,0.05)', padding:10, borderRadius:8}}>
                         <div className="input-group">
                            <label>Total Parcel Weight</label>
                            <NumericInput value={state.totalRoughWeight} onChange={v => setState({...state, totalRoughWeight: v})} />
                         </div>
                         <div className="input-group">
                            <label>Assorted Sample Weight</label>
                            <NumericInput value={state.sampleWeight} onChange={v => setState({...state, sampleWeight: v})} />
                         </div>
                         <div className="scale-display" style={{marginTop:8, fontSize:10, color:'#fbbf24', textAlign:'center'}}>
                            Multiplier: <b>{totals.scaleFactor.toFixed(2)}x</b>
                         </div>
                      </div>
                   )}
                </div>
             </div>

             <div className="card glass">
                <div className="card-hdr">Strategic Parameters</div>
                <div className="card-body">

                    <div className="input-group">
                       <label>Polished Shape</label>
                       <select className="ef-select" value={state.activeShape} onChange={e => setState({...state, activeShape: e.target.value})}>
                          {Object.keys(PRICE_LISTS).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="input-group">
                       <label>Strategy</label>
                       <select className="ef-select" value={state.strategy} onChange={e => setState({...state, strategy: e.target.value})}>
                          <option value="Whole">Whole Stone (1x)</option>
                          <option value="Sawn">Sawn (2x)</option>
                       </select>
                    </div>
                </div>
             </div>
          </div>

          <div className="calc-content" style={{flex:1}}>
             {activeTab === 'parcel_input' && (
                <div className="parcel-input-view">
                   <div className="section-hdr"><h2 className="title-glow">Parcel Profile Input</h2></div>
                   <div className="card glass" style={{maxWidth: 600}}>
                      <TenderProfileHeader 
                         tender={tenderData} 
                         parcel={parcelData} 
                         onParcelUpdate={(f,v) => setParcelData({...parcelData, [f]:v})} 
                         onTenderUpdate={(f,v) => setTenderData({...tenderData, [f]:v})}
                       />
                       <SizeProfileTable 
                         state={state} 
                         onAddRange={name => {
                            if (state.ranges.includes(name)) {
                               alert("Category already exists!");
                               return;
                            }
                            setState({...state, ranges: [...state.ranges, name]});
                         }}
                         onDeleteRange={deleteRange}
                         onUpdateRange={(rng, field, val) => {
                            setState(prev => ({
                               ...prev,
                               sizeProfile: {
                                  ...prev.sizeProfile,
                                  [rng]: {
                                     ...(prev.sizeProfile[rng] || { cts: 0, avg: 0 }),
                                     [field]: val
                                  }
                               }
                            }));
                         }}
                         totals={totals}
                       />
                       <FluoProfileTable 
                         totalWeight={sieveTotals.cts} 
                         totalPcs={sieveTotals.pcs}
                         fluoState={state.fluo || {}} 
                         onUpdate={(cat, val) => setState({ 
                           ...state, 
                           fluo: { ...state.fluo, [cat]: val } 
                         })} 
                       />
                   </div>
                </div>
             )}
             {activeTab === 'assortment' && (
                <div className="category-stack">
                   <div className="section-hdr">
                      <h2 className="title-glow">Rough Assortment Input (Image 1)</h2>
                   </div>
                   {state.ranges.length === 0 && (
                      <div className="empty-state">No categories added. Go to "Parcel Input" to add Sieve Ranges.</div>
                   )}
                   {state.ranges.map(r => (
                      <div key={r} style={{position:'relative'}}>
                         <button className="btn-del-abs" onClick={() => deleteRange(r)}>Remove Category</button>
                         <AssortmentTable 
                            range={r} 
                            state={state} 
                            onValueChange={handleValueChange} 
                            onSampleChange={handleSampleChange}
                            onUpdateConfig={handleConfigChange}
                          />
                      </div>
                   ))}
                </div>
             )}
             {activeTab === 'polish' && (
                <div className="category-stack">
                   <div className="section-hdr"><h2 className="title-glow">Polished Yield Calculation (Image 2)</h2></div>
                   {state.ranges.map(r => (
                      <PolishTable 
                         key={r} 
                         range={r} 
                         state={state} 
                         prices={globalPrices} 
                         sizeChart={state.sizeChart || MASTER_SIZE_CHART}
                         onUpdateConfig={handleConfigChange} 
                         onGlobalUpdate={(field, val) => setState({...state, [field]: val})}
                      />
                   ))}
                </div>
             )}
             {activeTab === 'prices' && (
                <PriceMasterView prices={globalPrices} onUpdate={onUpdateGlobalPrices} />
             )}
             {activeTab === 'summary' && (
                <div className="summary-report-view">
                   <div className="section-hdr" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h2 className="title-glow">Parcel Purchase Summary</h2>
                      <button className="btn btn-gold" onClick={() => window.print()}>🖨 Print Report</button>
                   </div>
                   <ParcelSummaryReport 
                     parcel={parcelData} 
                     tender={tenderData} 
                     state={state} 
                     prices={globalPrices} 
                   />
                </div>
              )}
             {activeTab === 'size_chart' && (
                <SizeChartView 
                   chart={state.sizeChart || MASTER_SIZE_CHART} 
                   onUpdate={newChart => setState({...state, sizeChart: newChart})} 
                />
             )}
          </div>
       </div>
    </div>
  );
}
