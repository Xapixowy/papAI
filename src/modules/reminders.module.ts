import { Reminder } from '@Entities/reminder.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from '@Services/reminders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder])],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
