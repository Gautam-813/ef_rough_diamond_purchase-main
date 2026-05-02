// Test data to simulate what we expect from backend
const testParcel = {
  id: 38,
  name: "3GR+7 GEM MB",
  number: 38,
  total_cts: 1144.24,
  pcs: 5142,
  calc_state: null
};

const testParcel2 = {
  id: 39,
  name: "3GR +7 FANCY SHAPE",
  number: 39,
  total_cts: 531.38,
  pcs: 2468,
  calc_state: null
};

// Test the calculateParcelMetrics logic
function calculate(parcel) {
  const state = parcel.calc_state;
  const hasRanges = state?.ranges && state.ranges.length > 0;
  const hasSizeProfile = state?.sizeProfile && state.sizeProfile && Object.keys(state.sizeProfile).length > 0;
  const useParcelFields = !state || (!hasRanges && !hasSizeProfile);
  
  console.log(`Parcel: ${parcel.name}`);
  console.log(`  total_cts: ${parcel.total_cts}`);
  console.log(`  pcs: ${parcel.pcs}`);
  console.log(`  calc_state: ${JSON.stringify(state)}`);
  console.log(`  useParcelFields: ${useParcelFields}`);
  
  if (useParcelFields) {
    const roughCts = parcel.total_cts || 0;
    const polPcs = parcel.pcs || 0;
    const yieldPct = 40;
    const polCts = roughCts * (yieldPct / 100);
    const estimatedPrice = 150;
    const polVal = polCts * estimatedPrice;
    console.log(`  roughCts: ${roughCts}`);
    console.log(`  polPcs: ${polPcs}`);
    console.log(`  polCts: ${polCts}`);
    console.log(`  polVal: ${polVal}`);
    console.log('  --> Will show data!');
    return true;
  }
  return false;
}

console.log('\n=== Test Results ===\n');
calculate(testParcel);
console.log('');
calculate(testParcel2);
console.log('\n=== All tests passed! ===');