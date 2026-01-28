const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCars() {
  try {
    const cars = await prisma.car.findMany({
      select: { tokenId: true, modelName: true, series: true },
      take: 5,
      orderBy: { tokenId: 'asc' }
    });
    
    console.log('Available cars in database:');
    console.log('===========================');
    
    if (cars.length === 0) {
      console.log('No cars found in database!');
      console.log('You need to mint a car first via gacha.');
    } else {
      cars.forEach(car => {
        console.log(`Token ID: ${car.tokenId} - ${car.modelName} (${car.series})`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCars();
