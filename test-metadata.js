// Quick test script untuk metadata
const { getCarImageUrl } = require('./dist/config/carImages');

console.log('Testing IPFS Image URLs:');
console.log('========================\n');

const testCars = [
  'Bugatti Chiron',
  'Ferrari F8',
  'BMW M3',
  'Honda Civic',
  'McLaren 720S'
];

testCars.forEach(car => {
  const url = getCarImageUrl(car);
  console.log(`${car}:`);
  console.log(`  ${url}`);
  console.log('');
});
