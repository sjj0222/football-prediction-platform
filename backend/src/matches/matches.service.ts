import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '../database/database.module';
import { eq, and, count, desc, ilike, or } from 'drizzle-orm';
import { matches } from '@server/database/schema';
import type { MatchInfo, MatchListResponse, CreateMatchRequest } from '@shared/api.interface';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getList(
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<MatchListResponse> {
    const keywords = q ? q.split(/\s+/).filter((k: string) => k.length > 0) : [];

    const searchConditions = keywords.map((keyword: string) =>
      or(
        ilike(matches.homeTeam, `%${keyword}%`),
        ilike(matches.awayTeam, `%${keyword}%`),
        ilike(matches.league, `%${keyword}%`),
      ),
    );

    const whereClause = searchConditions.length > 0 ? and(...searchConditions) : undefined;

    try {
      const [countResult, items] = await Promise.all([
        this.db.select({ count: count() }).from(matches).where(whereClause),
        this.db
          .select({
            id: matches.id,
            league: matches.league,
            homeTeam: matches.homeTeam,
            awayTeam: matches.awayTeam,
            matchTime: matches.matchTime,
          })
          .from(matches)
          .where(whereClause)
          .orderBy(desc(matches.matchTime))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: items.map((item) => this.mapMatchInfo(item)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(`获取比赛列表失败: q=${q}, error=${JSON.stringify(error)}`);
      throw error;
    }
  }

  async getById(id: string): Promise<MatchInfo> {
    const rows = await this.db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('比赛不存在');
    }
    return this.mapMatchInfo(rows[0]);
  }

  /**
   * 创建比赛；同 league+home+away+matchTime 已存在时直接返回已有比赛（幂等）。
   */
  async createOrGet(dto: CreateMatchRequest): Promise<{ match: MatchInfo; created: boolean }> {
    const matchTime = new Date(dto.matchTime);
    if (Number.isNaN(matchTime.getTime())) {
      throw new ConflictException('比赛时间格式不正确');
    }
    const league = (dto.league ?? '').trim();

    // 先查已存在（忽略毫秒差异，按分钟取整比对）
    const existing = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.homeTeam, dto.homeTeam.trim()),
          eq(matches.awayTeam, dto.awayTeam.trim()),
          eq(matches.league, league),
        ),
      )
      .limit(10);

    for (const row of existing) {
      const sameMinute =
        Math.floor(row.matchTime.getTime() / 60000) === Math.floor(matchTime.getTime() / 60000);
      if (sameMinute) {
        return { match: this.mapMatchInfo(row), created: false };
      }
    }

    const inserted = await this.db
      .insert(matches)
      .values({
        league,
        homeTeam: dto.homeTeam.trim(),
        awayTeam: dto.awayTeam.trim(),
        matchTime,
      })
      .returning();

    return { match: this.mapMatchInfo(inserted[0]), created: true };
  }

  private mapMatchInfo(row: {
    id: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    matchTime: Date;
  }): MatchInfo {
    return {
      id: row.id,
      league: row.league,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      matchTime: row.matchTime.toISOString(),
    };
  }
}
