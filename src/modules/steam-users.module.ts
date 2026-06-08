import { SteamUser } from '@Database/entities/steam-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SteamUsersService } from '@Services/steam-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([SteamUser])],
  providers: [SteamUsersService],
  exports: [SteamUsersService],
})
export class SteamUsersModule {}
