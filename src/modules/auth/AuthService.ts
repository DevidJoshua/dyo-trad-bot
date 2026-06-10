import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { JwtPayload } from '../../common/interfaces';
import crypto from 'crypto';

export class AuthService {
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async login(email: string, password: string): Promise<{ token: string; user: { id: number; email: string; role: string } } | null> {
    const hashed = this.hashPassword(password);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== hashed || !user.isActive) {
      return null;
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      return null;
    }
  }

  async seedAdmin(): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { email: config.admin.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: config.admin.email,
          password: this.hashPassword(config.admin.password),
          role: 'ADMIN',
        },
      });
      logger.info('Admin user seeded');
    }
  }
}

export const authService = new AuthService();
