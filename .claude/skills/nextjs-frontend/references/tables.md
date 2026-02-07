# Data Tables

Patterns for implementing data tables with sorting, filtering, pagination, and row actions using TanStack Table.

## Use When

- Displaying tabular data
- Implementing sorting and filtering
- Building paginated data views
- Creating selectable/actionable rows
- Handling large datasets

---

## Setup

### Install Dependencies

```bash
npm install @tanstack/react-table
```

### Basic Table Components

```tsx
// components/ui/table.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
```

---

## Basic Data Table

### Simple Table with TanStack Table

```tsx
// components/features/users/users-table.tsx
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    },
  },
];

interface UsersTableProps {
  data: User[];
}

export function UsersTable({ data }: UsersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Sorting

### Sortable Columns

```tsx
// components/features/users/sortable-users-table.tsx
'use client';

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Sortable column header component
function SortableHeader({
  column,
  children,
}: {
  column: any;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="-ml-4"
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return date.toLocaleDateString();
    },
  },
];

export function SortableUsersTable({ data }: { data: User[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <Table>
      {/* ... same as basic table */}
    </Table>
  );
}
```

---

## Filtering

### Column Filtering

```tsx
// components/features/users/filterable-users-table.tsx
'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FilterableUsersTable({ data }: { data: User[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      filterFn: 'includesString',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('name')?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />

        <Select
          value={(table.getColumn('role')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(value) =>
            table.getColumn('role')?.setFilterValue(value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          {/* ... */}
        </Table>
      </div>
    </div>
  );
}
```

### Global Filter (Search All Columns)

```tsx
// Global search across all columns
const [globalFilter, setGlobalFilter] = useState('');

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onGlobalFilterChange: setGlobalFilter,
  state: {
    globalFilter,
  },
});

// Search input
<Input
  placeholder="Search all columns..."
  value={globalFilter ?? ''}
  onChange={(e) => setGlobalFilter(e.target.value)}
  className="max-w-sm"
/>
```

---

## Pagination

### Client-Side Pagination

```tsx
// components/features/users/paginated-users-table.tsx
'use client';

import {
  ColumnDef,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function PaginatedUsersTable({ data }: { data: User[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>{/* ... */}</Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Rows per page
          </span>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Server-Side Pagination

```tsx
// components/features/users/server-paginated-table.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ServerPaginatedTable() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', pagination],
    queryFn: () =>
      api.get<PaginatedResponse<User>>('/users', {
        params: {
          page: String(pagination.pageIndex + 1),
          pageSize: String(pagination.pageSize),
        },
      }),
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? -1,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div>
      <Table>{/* ... */}</Table>
      <PaginationControls table={table} totalItems={data?.total ?? 0} />
    </div>
  );
}
```

---

## Row Selection

### Selectable Rows

```tsx
// components/features/users/selectable-users-table.tsx
'use client';

import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // ... other columns
];

export function SelectableUsersTable({ data }: { data: User[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm">
            {selectedRows.length} row(s) selected
          </span>
          <Button variant="outline" size="sm">
            Export Selected
          </Button>
          <Button variant="destructive" size="sm">
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>{/* ... */}</Table>
      </div>
    </div>
  );
}
```

---

## Row Actions

### Actions Column

```tsx
// components/features/users/table-row-actions.tsx
'use client';

import { Row } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RowActionsProps<T> {
  row: Row<T>;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function RowActions<T>({
  row,
  onView,
  onEdit,
  onDelete,
}: RowActionsProps<T>) {
  const item = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(item)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Usage in columns
const columns: ColumnDef<User>[] = [
  // ... other columns
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <RowActions
        row={row}
        onView={(user) => router.push(`/users/${user.id}`)}
        onEdit={(user) => router.push(`/users/${user.id}/edit`)}
        onDelete={(user) => handleDelete(user.id)}
      />
    ),
  },
];
```

---

## Column Visibility

### Toggle Columns

```tsx
// components/features/users/column-toggle.tsx
'use client';

import { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnToggleProps<T> {
  table: Table<T>;
}

export function ColumnToggle<T>({ table }: ColumnToggleProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Complete Data Table

### Full-Featured Table Component

```tsx
// components/features/data-table/data-table.tsx
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColumnToggle } from './column-toggle';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<T>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
              }
              onChange={(e) =>
                table.getColumn(searchKey)?.setFilterValue(e.target.value)
              }
              className="max-w-sm"
            />
          )}
        </div>
        <ColumnToggle table={table} />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
```

---

## Best Practices

### 1. Memoize Columns

```tsx
// Define columns outside component or use useMemo
const columns = useMemo<ColumnDef<User>[]>(
  () => [
    // ... columns
  ],
  []
);
```

### 2. Use Server-Side for Large Datasets

```tsx
// For 1000+ rows, use server-side pagination
const table = useReactTable({
  data,
  manualPagination: true,
  manualFiltering: true,
  manualSorting: true,
});
```

### 3. Accessible Tables

```tsx
// Use proper table semantics
<Table role="grid" aria-label="Users table">
  <TableHeader role="rowgroup">
    <TableRow role="row">
      <TableHead role="columnheader" scope="col">
```

### 4. Loading States

```tsx
// Show skeleton while loading
if (isLoading) {
  return <TableSkeleton rows={10} columns={5} />;
}
```

### 5. Empty States

```tsx
{table.getRowModel().rows.length === 0 && (
  <TableRow>
    <TableCell colSpan={columns.length} className="h-32 text-center">
      <EmptyState
        title="No users found"
        description="Try adjusting your search or filters"
        action={<Button onClick={clearFilters}>Clear filters</Button>}
      />
    </TableCell>
  </TableRow>
)}
```

---

## External Resources

- [TanStack Table](https://tanstack.com/table/latest)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [ARIA Table Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
