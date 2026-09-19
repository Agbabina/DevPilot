import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}
  @Post() create(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.projectsService.create(dto, req.user.userId);
  }
  @Get() findAll(@Req() req: any) {
    return this.projectsService.findAll(req.user.userId);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.findOne(id, req.user.userId);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @Req() req: any,
  ) {
    return this.projectsService.update(id, dto, req.user.userId);
  }
  @Delete(':id') remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.projectsService.remove(id, req.user.userId);
  }
}
