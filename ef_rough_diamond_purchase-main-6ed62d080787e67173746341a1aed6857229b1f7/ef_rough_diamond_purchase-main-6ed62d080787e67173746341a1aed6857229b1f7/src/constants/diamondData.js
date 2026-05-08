
export const COLOUR_LIST = ["DEF", "G", "H", "I", "J", "K", "L", "M", "CAPE"];
export const CLARITY_LIST = ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"];

export const SIEVE_RANGES = {
  // Mapping of physical sieves to Excel Price Ranges
  // Range 1: 0.002-0.004
  "+000 / -0": { priceIdx: "r1" }, "+0 / -1": { priceIdx: "r1" }, 
  
  // Range 2: 0.005-0.008
  "+1 / -1.5": { priceIdx: "r2" }, "+1.5 / -2": { priceIdx: "r2" },
  
  // Range 3: 0.009-0.021
  "+2": { priceIdx: "r3" }, "+2.5": { priceIdx: "r3" }, "+3": { priceIdx: "r3" }, "+3.5": { priceIdx: "r3" }, "+4": { priceIdx: "r3" },
  "+4.5 / -5": { priceIdx: "r3" }, "+5 / -5.5": { priceIdx: "r3" }, "+5.5 / -6": { priceIdx: "r3" }, "+6 / -6.5": { priceIdx: "r3" },
  
  // Range 4: 0.022-0.051
  "+6.5 / -7": { priceIdx: "r4" }, "+7": { priceIdx: "r4" }, "+7.5 / -8": { priceIdx: "r4" }, "+8": { priceIdx: "r4" },
  "+8.5 / -9": { priceIdx: "r4" },

  // Range 5: 0.052-0.077
  "+9": { priceIdx: "r5" }, "+9.5 / -10": { priceIdx: "r5" }, "+10 / -10.5": { priceIdx: "r5" },

  // Range 6: 0.078-0.115
  "+10.5 / -11": { priceIdx: "r6" }, "+11": { priceIdx: "r6" }, "+11.5 / -12": { priceIdx: "r6" },

  // Range 7: 0.116-0.158
  "+12": { priceIdx: "r7" }, "+12.5 / -13": { priceIdx: "r7" }, "+13": { priceIdx: "r7" }, 
  "+13.5": { priceIdx: "r7" }, "+14": { priceIdx: "r7" }, "+14.5": { priceIdx: "r7" },

  // Range 8: 0.159-0.200
  "+15": { priceIdx: "r8" }, "+15.5": { priceIdx: "r8" }, "+16": { priceIdx: "r8" },
  "-17": { priceIdx: "r8" }, "-18 / +19": { priceIdx: "r9" }, "-19 / +20": { priceIdx: "r10" }, 
  "3Gr": { priceIdx: "r11" }
};

export const PRICE_SIEVES = [
  { id: "r1", label: "0.002-0.004" },
  { id: "r2", label: "0.005-0.008" },
  { id: "r3", label: "0.009-0.021" },
  { id: "r4", label: "0.022-0.051" },
  { id: "r5", label: "0.052-0.077" },
  { id: "r6", label: "0.078-0.115" },
  { id: "r7", label: "0.116-0.158" },
  { id: "r8", label: "0.159-0.18" },
  { id: "r9", label: "0.19-0.22" },
  { id: "r10", label: "0.23-0.29" },
  { id: "r11", label: "0.30-0.39" },
  { id: "r12", label: "0.40-0.49" },
  { id: "r13", label: "0.50-0.69" },
  { id: "r14", label: "0.70-0.89" },
  { id: "r15", label: "0.90-0.99" },
  { id: "r16", label: "1.00-1.49" }
];

export const MASTER_SIZE_CHART = [
  { id: 1, ratio: "1/200", sieve: "+000 / -0", weight: "0.005", mm: "0.90-1.10" },
  { id: 2, ratio: "1/175", sieve: "+0 / -1", weight: "0.006", mm: "1.10-1.15" },
  { id: 3, ratio: "1/150", sieve: "+1 / -1.5", weight: "0.007", mm: "1.15-1.20" },
  { id: 4, ratio: "1/120", sieve: "+1.5 / -2", weight: "0.008", mm: "1.20-1.25" },
  { id: 5, ratio: "1/110", sieve: "+2, +2.5, +3", weight: "0.009, 0.010, 0.011", mm: "1.25-1.30, 1.30-1.35, 1.35-1.40" },
  { id: 6, ratio: "1/80", sieve: "+3.5 / -4, +4 / -4.5", weight: "0.012, 0.013", mm: "1.40-1.45, 1.45-1.50" },
  { id: 7, ratio: "1/70", sieve: "+4.5 / -5", weight: "0.014", mm: "1.50-1.55" },
  { id: 8, ratio: "1/60", sieve: "+5 / -5.5", weight: "0.016", mm: "1.55-1.60" },
  { id: 9, ratio: "1/50", sieve: "+5.5 / -6, +6 / -6.5", weight: "0.018, 0.021", mm: "1.60-1.70, 1.70-1.80" },
  { id: 10, ratio: "1/40", sieve: "+6.5 / -7", weight: "0.025", mm: "1.80-1.90" },
  { id: 11, ratio: "1/30", sieve: "+7 / -7.5, +7.5 / -8", weight: "0.029, 0.035", mm: "1.90 to 2.00, 2.00-2.10" },
  { id: 12, ratio: "1/25", sieve: "+8 / -8.5, +8.5 / -9", weight: "0.039, 0.044", mm: "2.10-2.20, 2.20-2.30" },
  { id: 13, ratio: "1/20", sieve: "+9 / -9.5, +9.5 / -10", weight: "0.052, 0.058", mm: "2.30-2.40, 2.40-2.50" },
  { id: 14, ratio: "1/15", sieve: "+10 / -10.5, +10.5 / -11", weight: "0.069, 0.074", mm: "2.50-2.60, 2.60-2.70" },
  { id: 15, ratio: "1/12", sieve: "+11 / -11.5, +11.5 / -12", weight: "0.078, 0.086", mm: "2.70-2.80, 2.80-2.90" },
  { id: 16, ratio: "1/10", sieve: "+12 / -12.5, +12.5 / -13", weight: "0.095, 0.108", mm: "2.90-3.00, 3.00-3.10" },
  { id: 17, ratio: "1/8", sieve: "+13 / -13.5, +13.5 / -14", weight: "0.116, 0.125", mm: "3.10-3.20, 3.20-3.30" },
  { id: 18, ratio: "1/7", sieve: "+14 / -14.5, +14.5 / -15", weight: "0.135, 0.146", mm: "3.30-3.40, 3.40-3.50" },
  { id: 19, ratio: "1/6", sieve: "+15 / +15.5, +15.5 / -16", weight: "0.159, 0.175", mm: "3.50-3.60, 3.60-3.70" },
  { id: 20, ratio: "1/5", sieve: "+16 / +17, -17 / +18", weight: "0.18, 0.20", mm: "3.60-3.80, 3.60-3.80" },
  { id: 21, ratio: "1/4", sieve: "-18 / +19, -19 / +20", weight: "0.25, 0.30", mm: "3.80-4.20, 4.20-4.60" },
  { id: 22, ratio: "3Gr", sieve: "3Gr", weight: "0.30, 0.35", mm: "4.20-4.60, 4.20-4.60" },
];

export const PRICE_LISTS = (() => {
  const full = {};
  ["Round", "Fancy"].forEach(shape => {
    full[shape] = {};
    PRICE_SIEVES.forEach(sv => {
      full[shape][sv.id] = {};
      COLOUR_LIST.forEach(colour => {
        full[shape][sv.id][colour] = {};
        CLARITY_LIST.forEach(clarity => {
          full[shape][sv.id][colour][clarity] = 0;
        });
      });
    });
  });
  return full;
})();

export const isHotSize = (colour, clarity) => {
  const hotColours = ["DEF", "G"];
  const hotClarities = ["VVS", "VS1"];
  return hotColours.includes(colour) && hotClarities.includes(clarity);
};
