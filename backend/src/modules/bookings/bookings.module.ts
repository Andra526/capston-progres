import { Module } from '@nestjs/common';
import { GymMembershipsModule } from '../gym-memberships/gym-memberships.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [GymMembershipsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
