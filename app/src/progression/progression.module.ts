import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../auth/user.entity";
import { XpLog } from "./xp-log.entity";
import { Task } from "../tasks/tasks.entity";
import { ProgressionController } from "./progression.controller";
import { ProgressionService } from "./progression.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, XpLog, Task])],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
