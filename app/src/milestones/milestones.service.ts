
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Project } from '../projects/projects.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import {
  Milestone,
  MilestoneStatus,
} from './milestones.entity';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async recalculateMilestoneProgress(
    milestoneId: number,
  ) {
    const milestone =
      await this.milestoneRepository.findOne({
        where: { id: milestoneId },
        relations: {
          tasks: true,
        },
      });

    if (!milestone) {
      throw new NotFoundException(
        'Milestone not found',
      );
    }

    const taskCount = milestone.tasks?.length ?? 0;

    const completedCount =
      milestone.tasks?.filter(
        (task) => task.status === 'COMPLETED',
      ).length ?? 0;

    const progress = taskCount
      ? Math.round(
          (completedCount / taskCount) * 100,
        )
      : 0;

    milestone.progress = progress;

    if (progress === 100 && taskCount > 0) {
      milestone.status = MilestoneStatus.COMPLETED;
      milestone.completedAt =
        milestone.completedAt ?? new Date();
    } else if (progress > 0) {
      milestone.status =
        MilestoneStatus.IN_PROGRESS;
      milestone.completedAt = null;
    } else {
      milestone.status = MilestoneStatus.TODO;
      milestone.completedAt = null;
    }

    await this.milestoneRepository.save(milestone);

    await this.recalculateProjectProgress(
      milestone.projectId,
    );

    return milestone;
  }

  private async recalculateProjectProgress(
    projectId: number,
  ) {
    const project =
      await this.projectRepository.findOne({
        where: { id: projectId },
        relations: {
          milestones: true,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    const milestones = project.milestones ?? [];

    const progress = milestones.length
      ? Math.round(
          milestones.reduce(
            (total, milestone) =>
              total + milestone.progress,
            0,
          ) / milestones.length,
        )
      : 0;

    project.progress = progress;

    await this.projectRepository.save(project);

    return progress;
  }

  private applyCompletionFields(
    milestone: Milestone,
  ) {
    if (
      milestone.status ===
      MilestoneStatus.COMPLETED
    ) {
      milestone.completedAt =
        milestone.completedAt ?? new Date();
    } else {
      milestone.completedAt = null;
    }

    return milestone;
  }

  async createForProject(
    projectId: number,
    createMilestoneDto: CreateMilestoneDto,
  ) {
    const project =
      await this.projectRepository.findOne({
        where: { id: projectId },
        relations: {
          milestones: true,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    const milestone =
      this.milestoneRepository.create({
        ...createMilestoneDto,
        project,
        projectId,
        progress: 0,
        status: MilestoneStatus.TODO,
      });

    this.applyCompletionFields(milestone);

    const savedMilestone =
      await this.milestoneRepository.save(
        milestone,
      );

    await this.recalculateProjectProgress(
      projectId,
    );

    return savedMilestone;
  }

  async findAllForProject(projectId: number) {
    const project =
      await this.projectRepository.findOne({
        where: { id: projectId },
        relations: {
          milestones: true,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return project.milestones;
  }

  async findOne(id: number) {
    const milestone =
      await this.milestoneRepository.findOne({
        where: { id },
        relations: {
          project: true,
        },
      });

    if (!milestone) {
      throw new NotFoundException(
        'Milestone not found',
      );
    }

    return milestone;
  }

  async update(
    id: number,
    updateMilestoneDto: UpdateMilestoneDto,
  ) {
    const milestone =
      await this.findOne(id);

    Object.assign(
      milestone,
      updateMilestoneDto,
    );

    this.applyCompletionFields(milestone);

    const updatedMilestone =
      await this.milestoneRepository.save(
        milestone,
      );

    await this.recalculateProjectProgress(
      milestone.projectId,
    );

    return updatedMilestone;
  }

  async remove(id: number) {
    const milestone =
      await this.findOne(id);

    await this.milestoneRepository.remove(
      milestone,
    );

    await this.recalculateProjectProgress(
      milestone.projectId,
    );

    return {
      message: 'Milestone deleted successfully',
    };
  }
}

