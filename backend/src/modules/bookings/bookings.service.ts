import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { GymMembershipsService } from '../gym-memberships/gym-memberships.service';
import { CreateBookingDto } from './dto/booking.dto';

const bookingInclude = {
  client: { select: { id: true, name: true, photoUrl: true } },
  trainer: {
    select: {
      id: true,
      specialization: true,
      gymId: true,
      user: { select: { id: true, name: true, photoUrl: true } },
    },
  },
  session: true,
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberships: GymMembershipsService,
  ) {}

  async create(clientId: string, dto: CreateBookingDto) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { id: dto.trainerId },
    });
    if (!trainer) throw new NotFoundException('Trainer tidak ditemukan');
    if (!trainer.isActive) {
      throw new BadRequestException('Trainer ini sedang tidak aktif');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Waktu sesi harus di masa depan');
    }

    // Aturan bisnis: booking PT hanya untuk member aktif di cabang PT tersebut.
    const hasMembership = await this.memberships.hasActiveMembership(
      clientId,
      trainer.gymId,
    );
    if (!hasMembership) {
      throw new ForbiddenException(
        'Anda butuh membership aktif di cabang ini untuk booking PT',
      );
    }

    const durationMin = dto.durationMin ?? 60;
    await this.assertNoOverlap(trainer.id, scheduledAt, durationMin);

    return this.prisma.booking.create({
      data: {
        clientId,
        trainerId: trainer.id,
        scheduledAt,
        durationMin,
        note: dto.note ?? '',
        goalType: dto.goalType ?? 'GENERAL',
      },
      include: bookingInclude,
    });
  }

  findForClient(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: bookingInclude,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findForTrainer(userId: string, status?: string) {
    const trainer = await this.trainerOf(userId);
    return this.prisma.booking.findMany({
      where: { trainerId: trainer.id, ...(status ? { status } : {}) },
      include: bookingInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async respond(userId: string, bookingId: string, status: 'ACCEPTED' | 'REJECTED') {
    const trainer = await this.trainerOf(userId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    if (booking.trainerId !== trainer.id) {
      throw new ForbiddenException('Ini bukan booking Anda');
    }
    if (booking.status !== 'PENDING') {
      throw new ConflictException('Hanya request berstatus PENDING yang bisa dijawab');
    }
    if (status === 'ACCEPTED') {
      await this.assertNoOverlap(
        trainer.id,
        booking.scheduledAt,
        booking.durationMin,
        booking.id,
      );
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: bookingInclude,
    });
  }

  async cancel(clientId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking tidak ditemukan');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('Ini bukan booking Anda');
    }
    if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
      throw new ConflictException('Booking ini tidak bisa dibatalkan');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: bookingInclude,
    });
  }

  private async trainerOf(userId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { userId },
    });
    if (!trainer) throw new NotFoundException('Profil trainer tidak ditemukan');
    return trainer;
  }

  /** Tolak jika PT sudah punya sesi ACCEPTED yang bertumpukan waktunya. */
  private async assertNoOverlap(
    trainerId: string,
    start: Date,
    durationMin: number,
    ignoreId?: string,
  ) {
    const end = new Date(start.getTime() + durationMin * 60000);
    const accepted = await this.prisma.booking.findMany({
      where: {
        trainerId,
        status: 'ACCEPTED',
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    });
    const clash = accepted.some((b) => {
      const bEnd = new Date(b.scheduledAt.getTime() + b.durationMin * 60000);
      return b.scheduledAt < end && bEnd > start;
    });
    if (clash) {
      throw new ConflictException('PT sudah punya sesi pada waktu tersebut');
    }
  }
}
