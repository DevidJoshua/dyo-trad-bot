import { prisma } from '../../common/utils/prisma';
import crypto from 'crypto';

export class ConversationService {
  async getOrCreateSession(sessionId?: string): Promise<{ sessionId: string; isNew: boolean }> {
    if (sessionId) {
      const existing = await prisma.chatSession.findUnique({ where: { sessionId } });
      if (existing) return { sessionId, isNew: false };
    }
    const newId = sessionId || crypto.randomUUID();
    await prisma.chatSession.create({ data: { sessionId: newId } });
    return { sessionId: newId, isNew: true };
  }

  async addMessage(sessionId: string, role: string, content: string): Promise<void> {
    const session = await prisma.chatSession.findUnique({ where: { sessionId } });
    if (!session) throw new Error('Session not found');

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role, content },
    });

    await prisma.chatSession.update({
      where: { sessionId },
      data: { updatedAt: new Date() },
    });
  }

  async getHistory(sessionId: string, limit: number = 50): Promise<{ role: string; content: string }[]> {
    const session = await prisma.chatSession.findUnique({ where: { sessionId } });
    if (!session) return [];

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map(m => ({ role: m.role, content: m.content }));
  }

  async getSessionCount(): Promise<number> {
    return prisma.chatSession.count();
  }

  async getMessageCount(): Promise<number> {
    return prisma.chatMessage.count();
  }

  async getRecentSessions(limit: number = 20) {
    return prisma.chatSession.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }
}

export const conversationService = new ConversationService();
