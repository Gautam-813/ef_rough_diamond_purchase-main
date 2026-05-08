export const mkPM = (base, factors, discounts) => {
  // Logic extracted from App.jsx to generate price master
  const pm = {};
  for (const [shape, list] of Object.entries(base)) {
    pm[shape] = {};
    for (const [range, price] of Object.entries(list)) {
      const f = factors[shape] || 1;
      const d = discounts[shape] || 0;
      pm[shape][range] = Math.round(price * f * (1 - d));
    }
  }
  return pm;
};

export const efPrice = (pm, shape, cr) => {
    if(!pm || !pm[shape]) return 0;
    const list = pm[shape];
    for (const [rng, val] of Object.entries(list)) {
        const [low, high] = rng.split('-').map(Number);
        if (cr >= low && cr <= high) return val;
    }
    // Fallback for last range
    const ranges = Object.keys(list);
    return list[ranges[ranges.length - 1]];
};

export const formatNum = (num, dec = 0) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  }).format(num);
};
