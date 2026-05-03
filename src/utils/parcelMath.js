import { formatNum } from './calculations';

export const getPriceIdxByWeight = (w) => {
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
   return "r16"; // 1.00 - 1.49+
};

export const calculateParcelTotals = (state, parcel, globalPrices, COLOUR_LIST, CLARITY_LIST, isHotSize) => {
   if (!state || !state.table) return null;

   let totalPolCts = 0;
   let totalPolPcs = 0;
   let totalValue = 0;
   let hotCts = 0;
   
   const rangeWise = {};
   const colorProfile = {};
   const clarityProfile = {};
   COLOUR_LIST.forEach(c => colorProfile[c] = 0);
   CLARITY_LIST.forEach(c => clarityProfile[c] = 0);

   const usableData = {
      usableRough: 0, usablePol: 0, usableVal: 0,
      nonUsableRough: 0, nonUsablePol: 0, nonUsableVal: 0,
      usablePcs: { DEF: { VVS: 0, VS1: 0 }, G: { VVS: 0, VS1: 0 }, H: { VVS: 0, VS1: 0 } },
      nonUsablePcs: { I: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 }, J: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 }, K: { VS2: 0, SI1: 0, SI2: 0, I1: 0, I2: 0 } }
   };

   const clarityGroups = {
      high: ['VVS', 'VS1', 'VS2'],
      low: ['SI1', 'SI2', 'I1', 'I2']
   };

   (state.ranges || []).forEach(r => {
      const target = state.sizeProfile?.[r] || { cts: 0, avg: 0 };
      const targetCts = parseFloat(target.cts) || 0;
      const sample = state.sampleConfig?.[r] || { cts: 0, pcs: 0 };
      const rangeScaleFactor = (targetCts > 0 && sample.cts > 0) ? (targetCts / sample.cts) : 1;

      const rCfg = state.rangeConfig?.[r] || {};
      const selectedShapes = rCfg.selectedShapes || ["Round"];

      const roundYield = parseFloat(rCfg.roundYield) || 44;
      const roundMultiplier = parseFloat(rCfg.roundMultiplier) || 1;
      const fancyYield = parseFloat(rCfg.fancyYield) || 40;
      const fancyMultiplier = parseFloat(rCfg.fancyMultiplier) || 1.5;

      const clarityMultipliers = rCfg.clarityMultipliers || {};
      const roundYieldByClarity = rCfg.roundYieldByClarity || {};
      const fancyYieldByClarity = rCfg.fancyYieldByClarity || {};
      const roundMultiplierByClarity = rCfg.roundMultiplierByClarity || {};
      const fancyMultiplierByClarity = rCfg.fancyMultiplierByClarity || {};

      rangeWise[r] = { pcs: 0, cts: 0, val: 0, roughCts: targetCts };

      // Helper for pIdx within this range
      const getGroupAvgSize = (shape, clarities) => {
         for (const colour of COLOUR_LIST) {
            for (const clarity of clarities) {
               const sCts = parseFloat(state.table?.[r]?.[colour]?.[shape]?.[clarity]?.cts) || 0;
               const sPcs = parseFloat(state.table?.[r]?.[colour]?.[shape]?.[clarity]?.pcs) || 0;
               if (sCts > 0 && sPcs > 0) {
                  const isRound = shape === "Round";
                  const cMult = parseFloat(clarityMultipliers[clarity]) || 1;
                  const yld = isRound ? (parseFloat(roundYieldByClarity[clarity]) || roundYield) : (parseFloat(fancyYieldByClarity[clarity]) || fancyYield);
                  const mult = isRound ? (parseFloat(roundMultiplierByClarity[clarity]) || roundMultiplier) : (parseFloat(fancyMultiplierByClarity[clarity]) || fancyMultiplier);

                  const polP = Math.round((sPcs * rangeScaleFactor * cMult) * mult);
                  const polC = (sCts * rangeScaleFactor * cMult) * (yld / 100);
                  if (polP > 0) return polC / polP;
               }
            }
         }
         return 0;
      };

      const avgs = {
         "Round": { high: getGroupAvgSize("Round", clarityGroups.high), low: getGroupAvgSize("Round", clarityGroups.low) },
         "Fancy": { high: getGroupAvgSize("Fancy", clarityGroups.high), low: getGroupAvgSize("Fancy", clarityGroups.low) }
      };

      COLOUR_LIST.forEach(col => {
         selectedShapes.forEach(shape => {
            CLARITY_LIST.forEach(clr => {
               const sPcs = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.pcs) || 0;
               const sCts = parseFloat(state.table?.[r]?.[col]?.[shape]?.[clr]?.cts) || 0;
               if (sCts === 0 && sPcs === 0) return;

               const cMult = parseFloat(clarityMultipliers[clr]) || 1;
               const isRound = shape === "Round";
               const priceShape = isRound ? "Round" : "Fancy";

               const yld = isRound ? (parseFloat(roundYieldByClarity[clr]) || roundYield) : (parseFloat(fancyYieldByClarity[clr]) || fancyYield);
               const mult = isRound ? (parseFloat(roundMultiplierByClarity[clr]) || roundMultiplier) : (parseFloat(fancyMultiplierByClarity[clr]) || fancyMultiplier);
               
               const roughC = sCts * rangeScaleFactor * cMult;
               const polC = parseFloat(formatNum(roughC * (yld / 100), 2).replace(/,/g, ''));
               const polP = Math.round((sPcs * rangeScaleFactor * cMult) * mult);

               const isHigh = clarityGroups.high.includes(clr);
               const grpAvg = isHigh ? avgs[priceShape].high : avgs[priceShape].low;
               const pIdx = getPriceIdxByWeight(grpAvg);

               const price = globalPrices?.[priceShape]?.[pIdx]?.[col]?.[clr] || 0;
               const val = polC * price;

               totalPolCts += polC;
               totalPolPcs += polP;
               totalValue += val;
               
               rangeWise[r].cts += polC;
               rangeWise[r].pcs += polP;
               rangeWise[r].val += val;

               colorProfile[col] += polC;
               clarityProfile[clr] += polC;

               if (isHotSize && isHotSize(col, clr)) hotCts += polC;

               // Usable vs Non-Usable logic
               const isUsable = ["DEF", "G", "H"].includes(col) && ["VVS", "VS1"].includes(clr);
               const isNonUsable = ["I", "J", "K"].includes(col) && ["VS2", "SI1", "SI2", "I1", "I2"].includes(clr);
               
               if (isUsable) {
                  usableData.usableRough += roughC;
                  usableData.usablePol += polC;
                  usableData.usableVal += val;
                  if (usableData.usablePcs[col]) usableData.usablePcs[col][clr] += polP;
               } else if (isNonUsable) {
                  usableData.nonUsableRough += roughC;
                  usableData.nonUsablePol += polC;
                  usableData.nonUsableVal += val;
                  if (usableData.nonUsablePcs[col]) usableData.nonUsablePcs[col][clr] += polP;
               }
            });
         });
      });
   });

   return { 
      totalCts: totalPolCts, 
      totalPcs: totalPolPcs,
      totalValue, 
      hotCts,
      rangeWise,
      colorProfile,
      clarityProfile,
      usableData
   };
};
