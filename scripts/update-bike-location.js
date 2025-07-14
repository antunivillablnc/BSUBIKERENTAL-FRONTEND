const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.bike.updateMany({
    where: { plateNumber: 'BSU 001' },
    data: {
      latitude: 13.9567,
      longitude: 121.1630,
    },
  });
  console.log('Location updated!');
}

main()
  .catch(e => { throw e; })
  .finally(async () => { await prisma.$disconnect(); }); 