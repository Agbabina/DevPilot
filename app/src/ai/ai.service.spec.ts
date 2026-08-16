import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { AiService } from './ai.service';

jest.mock('axios');

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'OPENROUTER_API_KEY' ? 'test-api-key' : undefined,
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('parses generated project JSON from the AI response', async () => {
    const payload = {
      description: 'A launch-ready MVP plan',
      milestones: [
        {
          title: 'Foundation',
          description: 'Set up the core app',
          difficulty: 'EASY',
          xpReward: 75,
          tasks: [
            {
              title: 'Create project skeleton',
              description: 'Initialize the app structure',
              priority: 'HIGH',
              xpReward: 40,
            },
          ],
        },
      ],
    };

    jest.mocked(axios.post).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: JSON.stringify(payload) } }],
      },
    } as never);

    await expect(
      service.generateProject({
        name: 'DevPilot',
        goal: 'Ship a demo',
        priority: 'HIGH',
      }),
    ).resolves.toEqual(payload);
  });
});
