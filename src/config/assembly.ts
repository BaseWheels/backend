/**
 * Assembly Forge Configuration
 * Defines car models that can be assembled from 5 fragments
 */

export interface AssembledCar {
  modelName: string;
  series: string;
  rarity: "rare" | "epic" | "legendary";
  probability: number; // 0-100
}

/**
 * Possible cars that can be assembled
 * Higher rarity = lower probability
 */
export const ASSEMBLED_CARS: AssembledCar[] = [
  // Rare tier (60% total)
  { modelName: "Nissan Skyline GT-R R34", series: "JDM Legend", rarity: "rare", probability: 25 },
  { modelName: "Toyota Supra MK4", series: "JDM Legend", rarity: "rare", probability: 20 },
  { modelName: "Mazda RX-7 FD", series: "JDM Legend", rarity: "rare", probability: 15 },

  // Epic tier (30% total)
  {
    modelName: "Porsche 911 Turbo S",
    series: "German Engineering",
    rarity: "epic",
    probability: 15,
  },
  { modelName: "BMW M5 CS", series: "German Engineering", rarity: "epic", probability: 10 },
  { modelName: "Audi RS6 Avant", series: "German Engineering", rarity: "epic", probability: 5 },

  // Legendary tier (10% total)
  { modelName: "McLaren P1", series: "Hypercar", rarity: "legendary", probability: 5 },
  { modelName: "Ferrari LaFerrari", series: "Hypercar", rarity: "legendary", probability: 3 },
  { modelName: "Porsche 918 Spyder", series: "Hypercar", rarity: "legendary", probability: 2 },
];

/**
 * Select a random assembled car based on probability distribution
 */
export function selectRandomAssembledCar(): AssembledCar {
  const totalProbability = ASSEMBLED_CARS.reduce((sum, car) => sum + car.probability, 0);
  let random = Math.random() * totalProbability;

  for (const car of ASSEMBLED_CARS) {
    random -= car.probability;
    if (random <= 0) {
      return car;
    }
  }

  // Fallback to first car (should never happen)
  return ASSEMBLED_CARS[0]!; // Non-null assertion since we know ASSEMBLED_CARS array is not empty
}

/**
 * Generate a unique token ID for assembled car NFT
 */
export function generateAssemblyTokenId(): number {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return parseInt(`${timestamp}${random}`.slice(-15));
}
