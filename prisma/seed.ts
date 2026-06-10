import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.strategy.createMany({
    data: [
      {
        name: 'RSI_REVERSAL',
        description: 'RSI Reversal Strategy - Buy when RSI < 30, Sell when RSI > 70',
        isActive: true,
        configuration: JSON.stringify({ period: 14, oversoldLevel: 30, overboughtLevel: 70 }),
      },
      {
        name: 'MA_CROSS',
        description: 'Moving Average Cross Strategy - MA20 crosses MA50',
        isActive: true,
        configuration: JSON.stringify({ fastPeriod: 20, slowPeriod: 50 }),
      },
      {
        name: 'BREAKOUT',
        description: 'Breakout Strategy - Break previous 20-candle high/low',
        isActive: true,
        configuration: JSON.stringify({ lookbackPeriod: 20 }),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.riskConfiguration.create({
    data: {
      riskPerTrade: 1.0,
      maxDailyLoss: 3.0,
      maxDrawdown: 10.0,
      maxOpenPositions: 5,
    },
  });

  await prisma.tradingAccount.create({
    data: {
      name: 'Main Trading Account',
      broker: 'MT5 Default',
      accountNumber: '1001',
      server: 'ICMarkets-Demo',
      status: 'ACTIVE',
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
