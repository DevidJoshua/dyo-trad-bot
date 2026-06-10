import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/tradbot',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  mt5: {
    bridgePort: parseInt(process.env.MT5_BRIDGE_PORT || '5000', 10),
    pollIntervalMs: parseInt(process.env.MT5_POLL_INTERVAL_MS || '1000', 10),
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@tradbot.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};
