import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://fbcpos_user:fbcpos_secret@localhost:5432/fbcpos_db?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'fbcpos-super-secure-jwt-secret-key-2026-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fbcpos-super-secure-refresh-jwt-secret-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'debug',
};
