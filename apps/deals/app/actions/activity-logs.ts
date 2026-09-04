'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { ActivityLogRecord, ActivityLogsFilter } from '@my-app/types';
import { runActivityLogsMigration, hasActivityLogsTable } from '@/lib/db-migration';

export interface ActivityLogsResponse {
  success: boolean;
  data?: ActivityLogRecord[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

export interface ActivityStatsResponse {
  success: boolean;
  totalLogs?: number;
  todayCount?: number;
  topAction?: string;
  uniqueActorsCount?: number;
  error?: string;
}

/**
 * Server action to retrieve paginated activity logs with IT Admin role enforcement.
 */
export async function getActivityLogs(
  filter: ActivityLogsFilter = {}
): Promise<ActivityLogsResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;

    if (userRole !== 'ITadmin') {
      return {
        success: false,
        error: 'Access Denied: Activity Logs are restricted to IT Administrators.',
      };
    }

    // Ensure table migration has been attempted
    await runActivityLogsMigration();
    const tableExists = await hasActivityLogsTable();
    if (!tableExists) {
      return {
        success: true,
        data: [],
        totalCount: 0,
        page: 1,
        pageSize: filter.pageSize || 20,
        totalPages: 1,
      };
    }

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    // Search query filter across multiple attributes
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const cleanSearch = filter.searchQuery.trim().replace(/'/g, "''");
      whereClauses.push(`(
        dealRegID LIKE '%${cleanSearch}%' OR
        custName LIKE '%${cleanSearch}%' OR
        projectName LIKE '%${cleanSearch}%' OR
        performedBy LIKE '%${cleanSearch}%' OR
        performedByName LIKE '%${cleanSearch}%' OR
        fieldName LIKE '%${cleanSearch}%' OR
        oldValue LIKE '%${cleanSearch}%' OR
        newValue LIKE '%${cleanSearch}%' OR
        remarks LIKE '%${cleanSearch}%'
      )`);
    }

    // Action filter
    if (filter.actionFilter && filter.actionFilter !== 'all') {
      const cleanAction = filter.actionFilter.trim().replace(/'/g, "''");
      whereClauses.push(`action = '${cleanAction}'`);
    }

    // Specific deal filter
    if (filter.dealID) {
      whereClauses.push(`dealID = ${Number(filter.dealID)}`);
    }
    if (filter.dealRegID) {
      const cleanRegId = filter.dealRegID.trim().replace(/'/g, "''");
      whereClauses.push(`dealRegID = '${cleanRegId}'`);
    }

    // Date range filter
    const now = new Date();
    if (filter.dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      whereClauses.push(`dtCreated >= '${todayStart}'`);
    } else if (filter.dateFilter === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      whereClauses.push(`dtCreated >= '${past7}'`);
    } else if (filter.dateFilter === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      whereClauses.push(`dtCreated >= '${past30}'`);
    } else if (filter.dateFilter === 'custom') {
      if (filter.startDate) {
        const sDate = new Date(filter.startDate).toISOString();
        whereClauses.push(`dtCreated >= '${sDate}'`);
      }
      if (filter.endDate) {
        const eDate = new Date(filter.endDate);
        eDate.setHours(23, 59, 59, 999);
        whereClauses.push(`dtCreated <= '${eDate.toISOString()}'`);
      }
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Get total matching count
    const countResult = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) AS totalCount
      FROM [dbo].[activity_logs]
      WHERE ${whereSql};
    `);
    const totalCount = Number(countResult?.[0]?.totalCount || 0);

    // 2. Fetch paginated records
    const records = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        logID, dealID, dealRegID, custName, projectName, action,
        fieldName, oldValue, newValue, remarks, performedBy,
        performedByName, performedByRole, impersonatedBy, dtCreated
      FROM [dbo].[activity_logs]
      WHERE ${whereSql}
      ORDER BY dtCreated DESC, logID DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `);

    const formattedRecords: ActivityLogRecord[] = (records || []).map((row) => ({
      logID: Number(row.logID),
      dealID: row.dealID != null ? Number(row.dealID) : null,
      dealRegID: row.dealRegID || null,
      custName: row.custName || null,
      projectName: row.projectName || null,
      action: row.action || 'UNKNOWN',
      fieldName: row.fieldName || null,
      oldValue: row.oldValue || null,
      newValue: row.newValue || null,
      remarks: row.remarks || null,
      performedBy: row.performedBy || 'Unknown',
      performedByName: row.performedByName || null,
      performedByRole: row.performedByRole || null,
      impersonatedBy: row.impersonatedBy || null,
      dtCreated: row.dtCreated ? new Date(row.dtCreated) : new Date(),
    }));

    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

    return {
      success: true,
      data: formattedRecords,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: getActivityLogs] Error:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server action to get quick KPI statistics for the activity logs overview.
 */
export async function getActivitySummaryStats(): Promise<ActivityStatsResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;

    if (userRole !== 'ITadmin') {
      return { success: false, error: 'Access Denied' };
    }

    const tableExists = await hasActivityLogsTable();
    if (!tableExists) {
      return {
        success: true,
        totalLogs: 0,
        todayCount: 0,
        topAction: 'None',
        uniqueActorsCount: 0,
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [totalRes, todayRes, topActionRes, actorsRes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) AS total FROM [dbo].[activity_logs]`),
      prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) AS today FROM [dbo].[activity_logs] WHERE dtCreated >= '${todayStart}'`),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT TOP 1 action, COUNT(*) as cnt 
        FROM [dbo].[activity_logs] 
        GROUP BY action 
        ORDER BY cnt DESC
      `),
      prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(DISTINCT performedBy) AS actors FROM [dbo].[activity_logs]`),
    ]);

    return {
      success: true,
      totalLogs: Number(totalRes?.[0]?.total || 0),
      todayCount: Number(todayRes?.[0]?.today || 0),
      topAction: topActionRes?.[0]?.action || 'None',
      uniqueActorsCount: Number(actorsRes?.[0]?.actors || 0),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
