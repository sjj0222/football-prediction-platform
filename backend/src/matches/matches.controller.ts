import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { Req } from '@nestjs/common';
import type { MatchInfo, MatchListResponse, CreateMatchRequest } from '@shared/api.interface';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  // 公开：比赛列表，支持按球队/联赛搜索
  @Get()
  async getList(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<MatchListResponse> {
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const pageSizeNum = pageSize && Number(pageSize) > 0 ? Math.min(Number(pageSize), 50) : 20;
    return this.matchesService.getList(q, pageNum, pageSizeNum);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MatchInfo> {
    return this.matchesService.getById(id);
  }

  // 登录用户创建比赛（幂等：已存在则返回已有比赛）
  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() _req: AuthenticatedRequest,
    @Body() dto: CreateMatchRequest,
  ): Promise<{ match: MatchInfo; created: boolean }> {
    return this.matchesService.createOrGet(dto);
  }
}
