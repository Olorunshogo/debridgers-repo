import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    MulterModule.register({ dest: "/tmp/uploads" }),
  ],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
