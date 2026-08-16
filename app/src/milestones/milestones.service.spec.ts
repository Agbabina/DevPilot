import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Milestone } from './milestones.entity';
import { MilestonesService } from './milestones.service';
import { Project } from '../projects/projects.entity';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let milestoneRepository: Repository<Milestone>;
  let projectRepository: Repository<Project>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestonesService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MilestonesService);
    milestoneRepository = moduleRef.get(getRepositoryToken(Milestone));
    projectRepository = moduleRef.get(getRepositoryToken(Project));
  });

  it('creates a milestone for a project and recalculates project progress', async () => {
    const project = {
      id: 1,
      progress: 0,
      milestones: [],
    } as Project;

    projectRepository.findOne.mockResolvedValue(project);
    milestoneRepository.create.mockReturnValue({
      title: 'Ship API',
      status: 'COMPLETED',
      projectId: 1,
    });
    milestoneRepository.save.mockResolvedValue({
      id: 1,
      title: 'Ship API',
      status: 'COMPLETED',
      projectId: 1,
    });

    await service.createForProject(1, {
      title: 'Ship API',
      description: 'Expose the milestone API',
      status: 'COMPLETED',
      order: 1,
      xpReward: 50,
    });

    expect(milestoneRepository.create).toHaveBeenCalled();
    expect(projectRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 100 }),
    );
  });
});
