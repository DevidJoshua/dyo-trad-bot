import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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

  await prisma.user.upsert({
    where: { email: 'admin@tradbot.com' },
    update: {},
    create: {
      email: 'admin@tradbot.com',
      password: hashPassword('admin123'),
      role: 'ADMIN',
    },
  });

  await prisma.aiConfiguration.upsert({
    where: { id: 1 },
    update: {},
    create: {
      enabled: true,
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o-mini',
      systemPrompt: 'You are a helpful trading assistant for the TradBot platform. You help users understand their trading data, platform features, and provide insights based on the knowledge base.',
      welcomeMessage: 'Hello! I am your AI trading assistant. Ask me about your positions, strategies, risk settings, or anything about the platform.',
      suggestedQuestions: JSON.stringify([
        'Show my open positions',
        'What strategies are active?',
        'How is my account performing?',
        'What are my risk settings?',
        'Tell me about your experience',
      ]),
    },
  });

  await prisma.knowledgeEntry.createMany({
    data: [
      {
        category: 'personal',
        title: 'About Devid Joshua',
        content: 'Devid Joshua is a software engineer and founder specializing in payment systems, fintech, and full-stack development. He builds scalable backend systems, trading platforms, and AI-powered applications.',
        tags: 'devid, joshua, about, bio, founder, engineer',
      },
      {
        category: 'skills',
        title: 'Technical Skills',
        content: 'Languages: TypeScript, JavaScript, Python, Java, Go, SQL. Frameworks: Node.js, React, Spring Boot, Express, NestJS. Databases: MySQL, PostgreSQL, MongoDB, Redis. Tools: Docker, Kubernetes, AWS, Prometheus, Grafana.',
        tags: 'skills, technologies, tech stack, programming',
      },
      {
        category: 'experience',
        title: 'Payment Systems Experience',
        content: 'Devid has extensive experience building payment processing systems, including payment gateways, transaction routing, fraud detection, and reconciliation systems. He has worked with multiple payment providers and built scalable fintech infrastructure.',
        tags: 'experience, payment, fintech, work, career',
      },
      {
        category: 'experience',
        title: 'Trading Platform Experience',
        content: 'Devid built the TradBot platform — a production-ready Forex trading bot integrating Node.js, TypeScript, MySQL, MetaTrader 5, and MQL5 Expert Advisors. The platform supports multiple strategies, risk management, backtesting, and real-time execution.',
        tags: 'experience, trading, forex, tradbot, project',
      },
      {
        category: 'contact',
        title: 'Contact Information',
        content: 'You can reach Devid Joshua via email or through the platform contact form. He is open to collaboration on fintech, trading systems, and AI projects.',
        tags: 'contact, email, reach, connect',
      },
      {
        category: 'portfolio',
        title: 'TradBot Platform',
        content: 'TradBot is a complete Forex trading automation platform with a Node.js backend, React dashboard, MySQL database, MT5 integration via MQL5 EA, risk management engine, strategy engine (RSI, MA Cross, Breakout), backtesting framework, Telegram notifications, and Prometheus/Grafana monitoring.',
        tags: 'portfolio, project, tradbot, trading, forex',
      },
    ],
    skipDuplicates: true,
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
