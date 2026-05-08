export const getPriceIdxFromRange = (rangeStr) => {
  if (!rangeStr) return "r1";
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

export const getPriceIdxByWeight = (w) => {
  if (!w || w <= 0) return "r1";
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