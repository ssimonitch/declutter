"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type Row,
} from "@tanstack/react-table";
import {
  listItems,
  searchItems,
  filterItemsByAction,
  filterItemsByCategory,
} from "@/lib/db";
import { createBlobUrl, revokeBlobUrl } from "@/lib/image-utils";
import type { DeclutterItem } from "@/lib/types";

interface ItemsTableProps {
  onRowClick?: (item: DeclutterItem) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
  refreshTrigger?: number; // Used to trigger data refresh
}

// Action display configuration
const actionConfig = {
  keep: {
    label: "保管",
    icon: "🏠",
    color: "bg-blue-100 text-blue-800",
    textColor: "text-blue-600",
  },
  online: {
    label: "オンライン販売",
    icon: "💰",
    color: "bg-green-100 text-green-800",
    textColor: "text-green-600",
  },
  thrift: {
    label: "リサイクル",
    icon: "🏪",
    color: "bg-yellow-100 text-yellow-800",
    textColor: "text-yellow-600",
  },
  donate: {
    label: "寄付",
    icon: "❤️",
    color: "bg-purple-100 text-purple-800",
    textColor: "text-purple-600",
  },
  trash: {
    label: "廃棄",
    icon: "🗑️",
    color: "bg-red-100 text-red-800",
    textColor: "text-red-600",
  },
} as const;

const columnHelper = createColumnHelper<DeclutterItem>();

export default function ItemsTable({
  onRowClick,
  onSelectionChange,
  className = "",
  refreshTrigger = 0,
}: ItemsTableProps) {
  const [data, setData] = useState<DeclutterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [debouncedGlobalFilter, setDebouncedGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

  // Responsive view state
  const [isMobile, setIsMobile] = useState(false);

  // Filters state
  const [actionFilter, setActionFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Check for mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Clean up image URLs on unmount
  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => {
        revokeBlobUrl(url);
      });
    };
  }, [imageUrls]);

  // Handle selection changes
  useEffect(() => {
    const selectedIds = Object.keys(rowSelection);
    onSelectionChange?.(selectedIds);
  }, [rowSelection, onSelectionChange]);

  // Debounce globalFilter to reduce DB queries while typing
  useEffect(() => {
    const id = setTimeout(() => setDebouncedGlobalFilter(globalFilter), 300);
    return () => clearTimeout(id);
  }, [globalFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let items: DeclutterItem[];

      // Apply filters in priority order
      if (debouncedGlobalFilter.trim()) {
        items = await searchItems(debouncedGlobalFilter);
      } else if (actionFilter) {
        items = await filterItemsByAction(actionFilter);
      } else if (categoryFilter) {
        items = await filterItemsByCategory(categoryFilter);
      } else {
        items = await listItems();
      }

      // Clean up previous image URLs and create new ones
      setImageUrls((prevUrls) => {
        // Clean up previous URLs
        prevUrls.forEach((url) => {
          revokeBlobUrl(url);
        });

        // Create new image URLs for thumbnails
        const newImageUrls = new Map<string, string>();
        items.forEach((item) => {
          if (item.thumbnail) {
            newImageUrls.set(item.id, createBlobUrl(item.thumbnail));
          }
        });

        return newImageUrls;
      });

      setData(items);
    } catch (err) {
      console.error("Failed to load items:", err);
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [debouncedGlobalFilter, actionFilter, categoryFilter]);

  // Load data
  useEffect(() => {
    loadData();
  }, [
    refreshTrigger,
    debouncedGlobalFilter,
    actionFilter,
    categoryFilter,
    loadData,
  ]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(data.map((item) => item.category))];
    return uniqueCategories.sort();
  }, [data]);

  // Table columns definition
  const columns = useMemo(
    () => [
      // Selection column
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-gray-300"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-gray-300"
          />
        ),
        size: 50,
      }),

      // Thumbnail column
      columnHelper.accessor("id", {
        id: "thumbnail",
        header: "画像",
        cell: ({ row }) => {
          const imageUrl = imageUrls.get(row.original.id);
          return (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Blob URLs not supported by Next.js Image
                <img
                  src={imageUrl}
                  alt={row.original.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        },
        size: 80,
        enableSorting: false,
      }),

      // Name column
      columnHelper.accessor("name", {
        header: "商品名",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {row.original.name}
            </div>
            {row.original.nameJapanese && (
              <div className="text-sm text-gray-500 truncate">
                {row.original.nameJapanese}
              </div>
            )}
          </div>
        ),
        size: 200,
      }),

      // Category column
      columnHelper.accessor("category", {
        header: "カテゴリー",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {getValue()}
          </span>
        ),
        size: 120,
      }),

      // Price range column
      columnHelper.accessor("estimatedPriceJPY", {
        id: "priceRange",
        header: "価格帯",
        cell: ({ getValue }) => {
          const price = getValue();
          const confidenceColor =
            price.confidence >= 0.7
              ? "text-green-600"
              : price.confidence >= 0.4
                ? "text-yellow-600"
                : "text-red-600";
          return (
            <div className="text-sm">
              <div className="font-medium">
                ¥{price.low.toLocaleString("ja-JP")} - ¥
                {price.high.toLocaleString("ja-JP")}
              </div>
              <div className={`text-xs ${confidenceColor}`}>
                信頼度: {Math.round(price.confidence * 100)}%
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const avgA =
            (rowA.original.estimatedPriceJPY.low +
              rowA.original.estimatedPriceJPY.high) /
            2;
          const avgB =
            (rowB.original.estimatedPriceJPY.low +
              rowB.original.estimatedPriceJPY.high) /
            2;
          return avgA - avgB;
        },
        size: 150,
      }),

      // Action column
      columnHelper.accessor("recommendedAction", {
        header: "アクション",
        cell: ({ getValue }) => {
          const action = getValue();
          const config = actionConfig[action];
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </span>
          );
        },
        size: 140,
      }),

      // Updated date column
      columnHelper.accessor("updatedAt", {
        header: "更新日",
        cell: ({ getValue }) => {
          const date = new Date(getValue());
          return (
            <div className="text-sm">
              <div>{date.toLocaleDateString("ja-JP")}</div>
              <div className="text-gray-500 text-xs">
                {date.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          return (
            new Date(rowA.original.updatedAt).getTime() -
            new Date(rowB.original.updatedAt).getTime()
          );
        },
        size: 100,
      }),
    ],
    [imageUrls],
  );

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: isMobile ? 10 : 20,
      },
      sorting: [
        {
          id: "updatedAt",
          desc: true,
        },
      ],
    },
    enableRowSelection: true,
  });

  const handleRowClick = (row: Row<DeclutterItem>) => {
    onRowClick?.(row.original);
  };

  // Mobile card component
  const MobileCard = ({ item }: { item: DeclutterItem }) => {
    const imageUrl = imageUrls.get(item.id);
    const config = actionConfig[item.recommendedAction];

    return (
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onRowClick?.(item)}
      >
        <div className="flex space-x-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Blob URLs not supported by Next.js Image
              <img
                src={imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </h3>
                {item.nameJapanese && (
                  <p className="text-sm text-gray-500 truncate">
                    {item.nameJapanese}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{item.category}</p>
              </div>
              <input
                type="checkbox"
                checked={rowSelection[item.id] || false}
                onChange={(e) => {
                  e.stopPropagation();
                  setRowSelection((prev) => {
                    const next = { ...prev };
                    if (e.target.checked) {
                      next[item.id] = true;
                    } else {
                      delete next[item.id];
                    }
                    return next;
                  });
                }}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-xs">
                <div className="font-medium">
                  ¥{item.estimatedPriceJPY.low.toLocaleString("ja-JP")} - ¥
                  {item.estimatedPriceJPY.high.toLocaleString("ja-JP")}
                </div>
                <div
                  className={`${
                    item.estimatedPriceJPY.confidence >= 0.7
                      ? "text-green-600"
                      : item.estimatedPriceJPY.confidence >= 0.4
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  信頼度: {Math.round(item.estimatedPriceJPY.confidence * 100)}%
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
              >
                <span className="mr-1">{config.icon}</span>
                {config.label}
              </span>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              {new Date(item.updatedAt).toLocaleDateString("ja-JP")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              検索
            </label>
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="商品名や説明で検索（入力中は遅延検索）"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              アクション
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">すべて</option>
              {Object.entries(actionConfig).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              カテゴリー
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">すべて</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <div>
            {data.length}件の商品
            {Object.keys(rowSelection).length > 0 && (
              <span className="ml-2 text-blue-600">
                ({Object.keys(rowSelection).length}件選択中)
              </span>
            )}
          </div>
          {(globalFilter || actionFilter || categoryFilter) && (
            <button
              onClick={() => {
                setGlobalFilter("");
                setActionFilter("");
                setCategoryFilter("");
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      </div>

      {/* Table or Mobile Cards */}
      {data.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            商品がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            商品を追加して始めましょう
          </p>
        </div>
      ) : isMobile ? (
        // Mobile Card View
        <div className="space-y-3">
          {table.getRowModel().rows.map((row) => (
            <MobileCard key={row.id} item={row.original} />
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ width: header.getSize() }}
                      >
                        <div className="flex items-center space-x-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: <span className="text-blue-600">↑</span>,
                            desc: <span className="text-blue-600">↓</span>,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 whitespace-nowrap text-sm"
                        onClick={(e) => {
                          // Prevent row click when clicking on checkbox
                          if ((e.target as HTMLElement).tagName === "INPUT") {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>
              ページ {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()}
            </span>
            <span>•</span>
            <span>
              {table.getRowModel().rows.length} / {data.length} 件
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              前へ
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
