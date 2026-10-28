import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private async trainerOf(userId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId },
    });
    if (!trainer) throw new NotFoundException('Profil trainer tidak ditemukan');
    return trainer;
  }

  /** Daftar klien seorang PT: member yang pernah punya booking aktif/selesai. */
  async findMine(userId: string) {
    const trainer = await this.trainerOf(userId);
    const bookings = await this.prisma.booking.findMany({
      where: {
        trainerId: trainer.id,
        status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
      },
      include: {
        client: { select: { id: true, name: true, email: true, photoUrl: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    const goals = await this.prisma.clientGoal.findMany({
      where: { trainerId: trainer.id },
    });

    const byClient = new Map<string, any>();
    for (const b of bookings) {
      const entry = byClient.get(b.clientId) ?? {
        ...b.client,
        totalSessions: 0,
        completedSessions: 0,
        hasUpcoming: false,
        goalType: b.goalType, // booking terbaru (urut menurun)
        goal: goals.find((g) => g.clientId === b.clientId) ?? null,
      };
      entry.totalSessions += 1;
      if (b.status === 'COMPLETED') entry.completedSessions += 1;
      if (b.status === 'ACCEPTED' || b.status === 'PENDING') {
        entry.hasUpcoming = true;
      }
      byClient.set(b.clientId, entry);
    }
    return Array.from(byClient.values()).map((c) => ({
      ...c,
      progress:
        c.totalSessions > 0 ? c.completedSessions / c.totalSessions : 0,
      isActive: c.hasUpcoming,
    }));
  }
}
