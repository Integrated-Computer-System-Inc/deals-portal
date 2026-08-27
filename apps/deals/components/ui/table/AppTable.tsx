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
  fixed?: 'left' | 'right' | boolean;
  ellipsis?: boolean;
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
            headerColor: 'var(--foreground)',
            rowHoverBg: 'var(--hover-bg)',
            colorBgContainer: 'transparent',
            headerSplitColor: 'transparent',
            cellPaddingBlock: 10,
            cellPaddingInline: 10,
          },
          Pagination: {
            colorBgContainer: 'var(--neutral)',
            colorText: 'var(--foreground)',
            colorPrimary: 'var(--accent-1)',
            colorBorder: 'var(--border)',
            colorBgTextHover: 'var(--hover-bg)',
            itemSize: 32,
          },
          Select: {
            colorBgContainer: 'var(--neutral)',
            colorText: 'var(--foreground)',
            colorBorder: 'var(--border)',
            controlItemBgHover: 'var(--hover-bg)',
            controlItemBgActive: 'var(--accent-1)',
          },
          Dropdown: {
            colorBgElevated: 'var(--card-bg)',
            colorText: 'var(--foreground)',
            colorTextDescription: 'var(--muted)',
            controlItemBgHover: 'var(--neutral)',
            paddingBlock: 6,
            borderRadiusLG: 10,
          },
        },
      }}
    >
      <div className={cn("app-table-wrapper border border-border/60 rounded-2xl overflow-hidden max-w-full bg-card-bg shadow-sm", className)}>
        <Table
          dataSource={dataSource}
          columns={resolvedColumns as any}
          pagination={resolvedPagination as any}
          scroll={{ x: 'max-content', ...props.scroll }}
          className="app-table"
          locale={{
            emptyText: (
              <AppEmptyState
                title="No deals found"
                description="No records match your active filters or search criteria."
                className="py-10 border-none bg-transparent"
              />
            ),
          }}
          {...props}
        />
      </div>
    </ConfigProvider>
  );
}
