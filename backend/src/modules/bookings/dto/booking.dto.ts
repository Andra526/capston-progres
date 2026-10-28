import { GOAL_TYPES, GoalType } from '../../../common/utils/goal-types';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  trainerId: string;

  /** Waktu mulai sesi dalam format ISO 8601, mis. 2026-11-02T14:00:00.000Z */
  @IsISO8601()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(180)
  durationMin?: number;

  @IsOptional()
  @IsString()
  note?: string;

  /** Paket tujuan: turun berat badan, naik massa otot, dll. */
  @IsOptional()
  @IsIn(GOAL_TYPES)
  goalType?: GoalType;
}

export class UpdateBookingStatusDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}
