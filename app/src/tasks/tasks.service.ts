
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Milestone } from '../milestones/milestones.entity';
import { MilestonesService } from '../milestones/milestones.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import {
  Task,
  TaskStatus,
} from './tasks.entity';

@Injectable()
export class TasksService {
  private static readonly TASK_XP_VALUES = [10, 25, 50, 75, 100];
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,

    private readonly milestonesService: MilestonesService,
  ) {}

  private applyCompletionFields(
    task: Task,
  ) {
    if (
      task.status === TaskStatus.COMPLETED
    ) {
      task.completedAt =
        task.completedAt ?? new Date();
    } else {
      task.completedAt = null;
    }

    return task;
  }

  private randomTaskXp(): number {
    const values = TasksService.TASK_XP_VALUES;
    return values[Math.floor(Math.random() * values.length)];
  }

  async createForMilestone(
    milestoneId: number,
    createTaskDto: CreateTaskDto,
  ) {
    const milestone =
      await this.milestoneRepository.findOne({
        where: { id: milestoneId },
      });

    if (!milestone) {
      throw new NotFoundException(
        'Milestone not found',
      );
    }

    const task =
      this.taskRepository.create({
        ...createTaskDto,
        milestone,
        milestoneId,
      });

    this.applyCompletionFields(task);

    const savedTask =
      await this.taskRepository.save(task);

    await this.milestonesService
      .recalculateMilestoneProgress(
        milestoneId,
      );

    return savedTask;
  }

  async findAllForMilestone(
    milestoneId: number,
  ) {
    const milestone =
      await this.milestoneRepository.findOne({
        where: { id: milestoneId },
      });

    if (!milestone) {
      throw new NotFoundException(
        'Milestone not found',
      );
    }

    return this.taskRepository.find({
      where: {
        milestoneId,
      },
      order: {
        order: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const task =
      await this.taskRepository.findOne({
        where: { id },
        relations: {
          milestone: true,
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    return task;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
  ) {
    const task =
      await this.findOne(id);

    Object.assign(
      task,
      updateTaskDto,
    );

    this.applyCompletionFields(task);

    const updatedTask =
      await this.taskRepository.save(task);

    await this.milestonesService
      .recalculateMilestoneProgress(
        task.milestoneId,
      );

    return updatedTask;
  }

  async remove(id: number) {
    const task =
      await this.findOne(id);

    const milestoneId =
      task.milestoneId;

    await this.taskRepository.remove(task);

    await this.milestonesService
      .recalculateMilestoneProgress(
        milestoneId,
      );

    return {
      message: 'Task deleted successfully',
    };
  }
}



