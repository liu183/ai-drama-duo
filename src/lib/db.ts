// ============================================================================
// 笔境 AI - Database Client
// 本地开发: SQLite (Prisma Client)
// Vercel 部署: PostgreSQL (Neon) via POSTGRES_PRISMA_URL (含 pgbouncer 连接池)
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 获取数据库 URL
 *
 * Vercel Postgres 自动设置以下环境变量：
 * - POSTGRES_PRISMA_URL    → Prisma 专用（含 pgbouncer），优先使用
 * - POSTGRES_URL           → 通用池化连接
 * - POSTGRES_URL_NON_POOLING → 直连（用于迁移）
 * - DATABASE_URL           → 通常等于 POSTGRES_PRISMA_URL
 */
function getDatabaseUrl(): string {
  // 优先使用 Vercel 自动设置的 Prisma 专用 URL
  const prismaUrl = process.env.POSTGRES_PRISMA_URL;
  if (prismaUrl) {
    return prismaUrl;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL 环境变量未设置。请在 .env.local 文件中配置 DATABASE_URL。'
    );
  }
  return url;
}

/**
 * 检测数据库类型
 */
function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

/**
 * 创建 PrismaClient 实例
 *
 * - 本地开发: 使用 SQLite，标准 Prisma Client
 * - Vercel 部署: 使用 PostgreSQL (Neon)，通过 pgbouncer 连接池
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  const isPostgres = isPostgresUrl(databaseUrl);
  const isVercel = !!process.env.VERCEL;

  if (isPostgres) {
    console.log(`[DB] Using PostgreSQL (Neon) — ${isVercel ? 'Vercel Production' : 'Local Dev'}`);

    return new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isVercel ? ['error'] : ['query', 'error', 'warn'],
    });
  }

  // 本地开发使用 SQLite
  console.log('[DB] Using SQLite (local development)');

  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
}

// ============================================================================
// 导出单例
// ============================================================================

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 健康检查 - 测试数据库连接
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  databaseType: string;
  isVercel: boolean;
  dramaCount: number;
  error?: string;
}> {
  const isVercel = !!process.env.VERCEL;
  const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
  const isPostgres = isPostgresUrl(databaseUrl);

  try {
    const dramaCount = await db.drama.count();

    return {
      ok: true,
      databaseType: isPostgres ? 'PostgreSQL (Neon)' : 'SQLite',
      isVercel,
      dramaCount,
    };
  } catch (error) {
    return {
      ok: false,
      databaseType: isPostgres ? 'PostgreSQL' : 'SQLite',
      isVercel,
      dramaCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
