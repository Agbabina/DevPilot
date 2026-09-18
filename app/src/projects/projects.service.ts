import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './projects.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../auth/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}
  async create(dto: CreateProjectDto, ownerId: number) {
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('User not found');
    return this.projectRepository.save(
      this.projectRepository.create({ ...dto, ownerId, owner }),
    );
  }
  findAll(ownerId: number) {
    return this.projectRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
    });
  }
  async findOne(id: number, ownerId: number) {
    const project = await this.projectRepository.findOne({
      where: { id, ownerId },
      relations: { milestones: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
  async update(id: number, dto: UpdateProjectDto, ownerId: number) {
    const project = await this.findOne(id, ownerId);
    Object.assign(project, dto);
    return this.projectRepository.save(project);
  }
  async remove(id: number, ownerId: number) {
    const project = await this.findOne(id, ownerId);
    await this.projectRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }
}
