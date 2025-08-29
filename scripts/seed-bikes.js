const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate BSU 001 - BSU 050
const bikes = Array.from({ length: 50 }).map((_, i) => ({
  name: `BSU ${String(i + 1).padStart(3, '0')}`,
  status: 'available'
}));

async function seedBikes() {
  try {
    console.log('🌱 Seeding bikes...');
    
    for (const bike of bikes) {
      const existing = await prisma.bike.findFirst({ where: { name: bike.name } });
      if (existing) {
        console.log(`⏭️  Skipped existing bike: ${bike.name}`);
        continue;
      }
      await prisma.bike.create({ data: bike });
      console.log(`✅ Added bike: ${bike.name}`);
    }
    
    console.log('🎉 All bikes seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding bikes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBikes(); 