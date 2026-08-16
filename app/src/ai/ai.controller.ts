import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('projects/generate')
  async generateProject(
      @Body()
      body: {
        name: string;
        goal: string;
        priority: string;
      },
  ) {
    return await this.aiService.generateProject(body);
  }

  @Post('tasks/generate')
  async generateTasks(
      @Body()
      body: {
        milestoneTitle: string;
        milestoneDescription?: string;
        projectName?: string;
        projectDescription?: string;
      },
  ) {
    return await this.aiService.generateTasks(body);
  }


  @Post('code/generate')
  async generateCode(
      @Body()
      body: {
        prompt: string;
        language?: string;
        context?: string;
      },
  ) {
    return await this.aiService.generateCode(body);
  }

  @Post('assist')
  async assist(
      @Body()
      body: {
        action: string;
        context?: string;
      },
  ) {
    return await this.aiService.assist(body);
  }
}

