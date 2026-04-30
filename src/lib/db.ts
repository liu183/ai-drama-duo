// ============================================================================
// 笔境 AI - Database Client
// 本地开发: SQLite (Prisma Client via schema.prisma)
// Vercel 部署: PostgreSQL (Supabase) via DATABASE_URL (pgbouncer 连接池)
//              迁移/DDL 操作通过 DIRECT_URL (直连)
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 检测数据库类型
 *
 * Vercel 环境变量:
 * - DATABASE_URL   → 池化连接 (运行时查询，含 pgbouncer)
 * - DIRECT_URL     → 直连 (用于 prisma db push / migrate 等 DDL 操作)
 *
 * 本地开发:
 * - DATABASE_URL   → SQLite 文件路径 (file:./dev.db)
 */
function isPostgresEnv(): boolean {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

/**
 * 创建 PrismaClient 实例
 *
 * - 本地开发: 使用 SQLite（schema.prisma），标准 Prisma Client
 * - Vercel 部署: 使用 PostgreSQL（schema.postgres.prisma）
 *   构建时通过 vercel.json buildCommand 执行:
 *     1. prisma generate --schema=prisma/schema.postgres.prisma  (生成客户端)
 *     2. prisma db push  --schema=prisma/schema.postgres.prisma  (同步表结构)
 *   schema.postgres.prisma 中 url/DIRECT_URL 由 Prisma 自动读取环境变量
 */
function createPrismaClient(): PrismaClient {
  const isPostgres = isPostgresEnv();
  const isVercel = !!process.env.VERCEL;

  if (isPostgres) {
    console.log(`[DB] Using PostgreSQL (Supabase) — ${isVercel ? 'Vercel Production' : 'Local Dev'}`);

    // PostgreSQL 模式: Prisma Client 由 schema.postgres.prisma 生成，
    // 已内置 url + directUrl 配置，无需手动覆盖 datasources
    return new PrismaClient({
      log: isVercel ? ['error'] : ['query', 'error', 'warn'],
    });
  }

  // 本地开发使用 SQLite
  console.log('[DB] Using SQLite (local development)');

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

// ============================================================================
// 导出单例 — 确保开发模式下热重载不会创建多个连接
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
  const isPostgres = isPostgresEnv();

  try {
    const dramaCount = await db.drama.count();

    return {
      ok: true,
      databaseType: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite',
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
