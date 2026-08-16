import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ProgressionService } from "./progression.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("progression")
@UseGuards(JwtAuthGuard)
export class ProgressionController {
  constructor(
    private readonly progressionService: ProgressionService,
  ) {}

  @Get("me")
  getProgress(@Req() request: any) {
    return this.progressionService.getProgress(request.user.userId);
  }

  @Post("me/purchase")
  purchase(@Req() request: any, @Body("item") item: string) {
    return this.progressionService.purchaseItem(
      request.user.userId,
      item as any,
    );
  }
  @Post('link-github')
  @UseGuards(JwtAuthGuard) // Ensure user is authenticated
  async linkGithub(
      @Req() req: any,
      @Body('githubUsername') githubUsername: string,
  ) {
    return this.progressionService.linkGithubAccount(req.user.id, githubUsername);
  }
}