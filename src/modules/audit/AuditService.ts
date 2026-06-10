import { prisma } from '../../common/utils/prisma';

export class AuditService {
  async log(action: string, entity: string, entityId?: number, details?: string, userId?: number): Promise<void> {
    await prisma.auditLog.create({
      data: { action, entity, entityId, details, userId },
    });
  }

  async getLogs(limit: number = 100, offset: number = 0) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

export const auditService = new AuditService();
