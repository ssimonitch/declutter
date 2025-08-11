import Papa from "papaparse";
import { DeclutterItem } from "@/lib/types";

/**
 * Sanitizes a cell value to prevent CSV injection attacks
 * Escapes cells that start with =, +, -, @ by prefixing with single quote
 */
function sanitizeCSVCell(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if the cell starts with potentially dangerous characters
  if (stringValue.match(/^[=+\-@]/)) {
    return `'${stringValue}`;
  }

  return stringValue;
}

/**
 * Formats a date string to Japanese locale format
 */
function formatDateJapanese(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString; // Return original if parsing fails
  }
}

/**
 * Formats a JPY amount with proper currency symbol
 */
function formatJPYCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) {
    return "";
  }

  return `¥${amount.toLocaleString("ja-JP")}`;
}

/**
 * Converts array fields to comma-separated string in quotes
 */
function formatArrayField(array: string[] | undefined): string {
  if (!array || array.length === 0) {
    return "";
  }

  return `"${array.join(", ")}"`;
}

/**
 * Transforms a DeclutterItem to CSV-ready row data
 */
function transformItemToCSVRow(item: DeclutterItem): Record<string, string> {
  return {
    ID: sanitizeCSVCell(item.id),

    // Name fields
    "Name Japanese Specific": sanitizeCSVCell(item.nameJapaneseSpecific),
    "Name English Specific": sanitizeCSVCell(item.nameEnglishSpecific),
    "Name Japanese Generic": sanitizeCSVCell(item.nameJapaneseGeneric),
    "Name English Generic": sanitizeCSVCell(item.nameEnglishGeneric),

    Description: sanitizeCSVCell(item.description),
    Category: sanitizeCSVCell(item.category),
    Condition: sanitizeCSVCell(item.condition),
    Quantity: sanitizeCSVCell(item.quantity || 1),

    // Pricing fields
    "Online Auction Price Range (JPY)": `${formatJPYCurrency(
      item.onlineAuctionPriceJPY.low,
    )} - ${formatJPYCurrency(item.onlineAuctionPriceJPY.high)}`,
    "Online Auction Price Low (JPY)": formatJPYCurrency(
      item.onlineAuctionPriceJPY.low,
    ),
    "Online Auction Price High (JPY)": formatJPYCurrency(
      item.onlineAuctionPriceJPY.high,
    ),
    "Online Auction Price Confidence": sanitizeCSVCell(
      Math.round(item.onlineAuctionPriceJPY.confidence * 100) + "%",
    ),
    "Thrift Shop Price Range (JPY)": `${formatJPYCurrency(
      item.thriftShopPriceJPY.low,
    )} - ${formatJPYCurrency(item.thriftShopPriceJPY.high)}`,
    "Thrift Shop Price Low (JPY)": formatJPYCurrency(
      item.thriftShopPriceJPY.low,
    ),
    "Thrift Shop Price High (JPY)": formatJPYCurrency(
      item.thriftShopPriceJPY.high,
    ),
    "Thrift Shop Price Confidence": sanitizeCSVCell(
      Math.round(item.thriftShopPriceJPY.confidence * 100) + "%",
    ),

    "Recommended Action": sanitizeCSVCell(item.recommendedAction),
    "Action Rationale": sanitizeCSVCell(item.actionRationale || ""),
    Marketplaces: formatArrayField(item.marketplaces),
    "Search Queries": formatArrayField(item.searchQueries),
    Keywords: formatArrayField(item.keywords),
    "Special Notes": sanitizeCSVCell(item.specialNotes || ""),
    "Disposal Cost (JPY)":
      item.disposalCostJPY !== undefined && item.disposalCostJPY !== null
        ? formatJPYCurrency(item.disposalCostJPY)
        : "",

    "Municipality Code": sanitizeCSVCell(item.municipalityCode || ""),
    "Created At": formatDateJapanese(item.createdAt),
    "Updated At": formatDateJapanese(item.updatedAt),
  };
}

/**
 * Generates CSV content from DeclutterItem array
 */
export function generateCSVContent(items: DeclutterItem[]): string {
  if (items.length === 0) {
    return "";
  }

  // Transform items to CSV-ready format
  const csvData = items.map(transformItemToCSVRow);

  // Generate CSV using Papaparse
  const csv = Papa.unparse(csvData, {
    header: true,
    delimiter: ",",
    quotes: true, // Force quotes around fields containing special characters
    quoteChar: '"',
    escapeChar: '"',
    skipEmptyLines: true,
  });

  return csv;
}

/**
 * Creates a Blob with UTF-8 BOM for proper Japanese character display in Excel
 */
export function createCSVBlob(csvContent: string): Blob {
  // UTF-8 BOM (Byte Order Mark) for Excel compatibility
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  return new Blob([csvWithBOM], {
    type: "text/csv;charset=utf-8;",
  });
}

/**
 * Triggers download of CSV file
 */
export function downloadCSV(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function that handles the complete CSV export process
 */
export function exportItemsToCSV(
  items: DeclutterItem[],
  options: {
    filename?: string;
    selectedIds?: string[];
  } = {},
): void {
  try {
    // Filter items if specific IDs are provided
    const itemsToExport = options.selectedIds
      ? items.filter((item) => options.selectedIds!.includes(item.id))
      : items;

    if (itemsToExport.length === 0) {
      throw new Error("No items to export");
    }

    // Generate CSV content
    const csvContent = generateCSVContent(itemsToExport);

    // Create blob with BOM
    const blob = createCSVBlob(csvContent);

    // Generate filename with timestamp if not provided
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = options.filename || `declutter-items-${timestamp}.csv`;

    // Trigger download
    downloadCSV(blob, filename);

    console.log(
      `Successfully exported ${itemsToExport.length} items to ${filename}`,
    );
  } catch (error) {
    console.error("Failed to export items to CSV:", error);
    throw error;
  }
}

/**
 * Export utility for filtered/selected items
 */
export function exportSelectedItems(
  allItems: DeclutterItem[],
  selectedIds: string[],
  filename?: string,
): void {
  exportItemsToCSV(allItems, { selectedIds, filename });
}

/**
 * Export utility for all items
 */
export function exportAllItems(
  items: DeclutterItem[],
  filename?: string,
): void {
  exportItemsToCSV(items, { filename });
}
