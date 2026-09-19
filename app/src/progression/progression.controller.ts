import {
  Body,
  Controller,
  Headers,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ProgressionService } from './progression.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from './public.decorator';

@Controller('progression')
@UseGuards(JwtAuthGuard)
export class ProgressionController {
  constructor(
    private readonly progressionService: ProgressionService,
    private readonly config: ConfigService,
  ) {}
  @Get('me') getProgress(@Req() req: any) {
    return this.progressionService.getProgress(req.user.userId);
  }
  @Post('me/purchase') purchase(@Req() req: any, @Body('item') item: string) {
    return this.progressionService.purchaseItem(req.user.userId, item as any);
  }
  @Post('link-github') async linkGithub(
    @Req() req: any,
    @Body('githubUsername') githubUsername: string,
  ) {
    return this.progressionService.linkGithubAccount(
      req.user.userId,
      githubUsername,
    );
  }

  @Post('github/webhook')
  @Public()
  async githubWebhook(
    @Req() req: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (secret) {
      const expected = `sha256=${createHmac('sha256', secret)
        .update(req.rawBody ?? '')
        .digest('hex')}`;
      const provided = Buffer.from(signature ?? '');
      const expectedBuffer = Buffer.from(expected);
      if (
        provided.length !== expectedBuffer.length ||
        !timingSafeEqual(provided, expectedBuffer)
      )
        return { status: 'ignored', reason: 'Invalid webhook signature' };
    }
    if (req.headers['x-github-event'] !== 'push')
      return { status: 'ignored', reason: 'Unsupported GitHub event' };
    const payload = req.body;
    const username =
      payload?.repository?.owner?.login ?? payload?.sender?.login;
    const repoName =
      payload?.repository?.full_name ?? payload?.repository?.name ?? 'unknown';
    if (!username)
      return { status: 'ignored', reason: 'Missing repository owner' };
    const results: any[] = [];
    for (const commit of Array.isArray(payload?.commits) ? payload.commits : [])
      if (commit?.id)
        results.push(
          await this.progressionService.processGithubCommit(
            username,
            commit.id,
            commit.message ?? '',
            repoName,
          ),
        );
    return { status: 'processed', repository: repoName, commits: results };
  }
}
