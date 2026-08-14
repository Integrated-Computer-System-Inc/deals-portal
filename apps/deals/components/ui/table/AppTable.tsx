'use client';

import React from 'react';
import { Table, ConfigProvider } from 'antd';
import type { TableProps } from 'antd';
import { cn } from '../../utils/cn';
import AppEmptyState from '../empty-state/AppEmptyState';

export interface AppTableColumnType<RecordType> {
  title: React.ReactNode;
  dataIndex?: string | string[];
  key?: string;
  slotName?: string;
  render?: (value: any, record: RecordType, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sorter?: boolean | ((a: RecordType, b: RecordType) => number);
  defaultSortOrder?: 'ascend' | 'descend';
  sortDirections?: ('ascend' | 'descend')[];
}

export interface AppTableProps<RecordType> extends Omit<TableProps<RecordType>, 'columns'> {
  columns: AppTableColumnType<RecordType>[];
  dataSource: RecordType[];
  slots?: Record<string, (value: any, record: RecordType, index: number) => React.ReactNode>;
  className?: string;
}

export function AppTable<RecordType extends object>({
  columns,
  dataSource,
  className,
  pagination,
  slots,
  ...props
}: AppTableProps<RecordType>) {
  const resolvedColumns = React.useMemo(() => {
    if (!slots) return columns;
    return columns.map((col) => {
      const slot = col.slotName;
      if (slot && slots[slot]) {
        return {
          ...col,
          render: (value: any, record: RecordType, index: number) =>
            slots[slot](value, record, index),
        };
      }
      return col;
    });
  }, [columns, slots]);

  const resolvedPagination = pagination;

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: 'var(--neutral)',
            headerColor: 'var(--text-info)',
            rowHoverBg: 'var(--hover-bg)',
            colorBgContainer: 'transparent',
            headerSplitColor: 'transparent',
            cellPaddingBlock: 12,
            cellPaddingInline: 14,
          },
        },
      }}
    >
      <div className={cn("app-table-wrapper border border-border/60 rounded-2xl overflow-x-auto max-w-full bg-card-bg shadow-sm", className)}>
        <Table
          dataSource={dataSource}
          columns={resolvedColumns as any}
          pagination={resolvedPagination as any}
          className="app-table"
          locale={{
            emptyText: (
              <AppEmptyState
                title="No items found"
                description="There is no data to display in this table."
                imageSrc="/mascott/proport-mascott-idle.svg"
                imageSize={70}
                className="py-6 border-none bg-transparent"
              />
            ),
          }}
          {...props}
        />
      </div>
    </ConfigProvider>
  );
}
