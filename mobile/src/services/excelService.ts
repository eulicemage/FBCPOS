import { Product } from '../../../shared/src';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedProductRow {
  barcode: string;
  name: string;
  category?: string;
  sellingPrice: number;
  costPrice?: number;
  wholesalePrice?: number;
  unitOfMeasure?: string;
  expirationDate?: string;
  isTaxable?: boolean;
}

export interface ParsedInventoryRow {
  barcode: string;
  quantity: number;
  drNumber?: string;
  deliveryDate?: string;
  expirationDate?: string;
  supplier?: string;
}

export class ExcelService {
  /**
   * Parses CSV/Excel exported text into Product entries with relaxed optional fields.
   * Missing columns will fall back to sensible defaults rather than throwing an error.
   */
  static parseProductsCsv(csvText: string): {
    items: ParsedProductRow[];
    successCount: number;
    warnings: string[];
  } {
    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { items: [], successCount: 0, warnings: ['Empty CSV file'] };

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_"-]/g, ''));
    const items: ParsedProductRow[] = [];
    const warnings: string[] = [];

    // Map column indices
    const barcodeIdx = headers.findIndex((h) => h.includes('barcode') || h.includes('sku') || h.includes('code'));
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('desc') || h.includes('title'));
    const priceIdx = headers.findIndex((h) => (h.includes('price') || h.includes('retail') || h.includes('selling')) && !h.includes('cost') && !h.includes('whole'));
    const costIdx = headers.findIndex((h) => h.includes('cost'));
    const wholesaleIdx = headers.findIndex((h) => h.includes('wholesale'));
    const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('cat') || h.includes('dept'));
    const uomIdx = headers.findIndex((h) => h.includes('unit') || h.includes('uom'));
    const expiryIdx = headers.findIndex((h) => h.includes('exp') || h.includes('date'));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every((c) => c === '')) continue;

      const rawBarcode = barcodeIdx >= 0 && cols[barcodeIdx] ? cols[barcodeIdx] : `AUTO-${Date.now()}-${i}`;
      const rawName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Product ${rawBarcode}`;
      const rawPrice = priceIdx >= 0 && cols[priceIdx] ? parseFloat(cols[priceIdx]) : 0;
      const rawCost = costIdx >= 0 && cols[costIdx] ? parseFloat(cols[costIdx]) : 0;
      const rawWholesale = wholesaleIdx >= 0 && cols[wholesaleIdx] ? parseFloat(cols[wholesaleIdx]) : rawPrice * 0.9;
      const rawCat = categoryIdx >= 0 && cols[categoryIdx] ? cols[categoryIdx] : 'General';
      const rawUom = uomIdx >= 0 && cols[uomIdx] ? cols[uomIdx] : 'PCS';
      const rawExpiry = expiryIdx >= 0 && cols[expiryIdx] ? cols[expiryIdx] : undefined;

      items.push({
        barcode: rawBarcode,
        name: rawName,
        sellingPrice: isNaN(rawPrice) ? 0 : rawPrice,
        costPrice: isNaN(rawCost) ? 0 : rawCost,
        wholesalePrice: isNaN(rawWholesale) ? (isNaN(rawPrice) ? 0 : rawPrice * 0.9) : rawWholesale,
        category: rawCat,
        unitOfMeasure: rawUom,
        expirationDate: rawExpiry,
        isTaxable: true,
      });
    }

    return {
      items,
      successCount: items.length,
      warnings,
    };
  }

  /**
   * Generates CSV format string from Products array
   */
  static exportProductsCsv(products: Product[]): string {
    const header = 'Barcode,SKU,Name,Category,RetailPrice,CostPrice,WholesalePrice,UnitOfMeasure,Taxable';
    const rows = products.map((p) => {
      const wholesale = (p as any).wholesalePrice ?? (p.sellingPrice * 0.9);
      return `"${p.barcode}","${p.sku}","${p.name.replace(/"/g, '""')}","${p.categoryId}","${p.sellingPrice.toFixed(2)}","${p.costPrice.toFixed(2)}","${wholesale.toFixed(2)}","${p.unitOfMeasure}","${p.isTaxable ? 'YES' : 'NO'}"`;
    });
    return [header, ...rows].join('\r\n');
  }

  /**
   * Parses Inventory CSV with Delivery Report Number (DR#)
   */
  static parseInventoryCsv(csvText: string): {
    items: ParsedInventoryRow[];
    successCount: number;
    warnings: string[];
  } {
    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { items: [], successCount: 0, warnings: ['Empty CSV file'] };

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_"-]/g, ''));
    const barcodeIdx = headers.findIndex((h) => h.includes('barcode') || h.includes('sku') || h.includes('code'));
    const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('stock') || h.includes('count'));
    const drIdx = headers.findIndex((h) => h.includes('dr') || h.includes('delivery') || h.includes('report') || h.includes('ref'));
    const dateIdx = headers.findIndex((h) => h.includes('date') && !h.includes('exp'));
    const expiryIdx = headers.findIndex((h) => h.includes('exp'));
    const supplierIdx = headers.findIndex((h) => h.includes('supp') || h.includes('vendor'));

    const items: ParsedInventoryRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every((c) => c === '')) continue;

      const rawBarcode = barcodeIdx >= 0 ? cols[barcodeIdx] : '';
      if (!rawBarcode) continue;

      const rawQty = qtyIdx >= 0 && cols[qtyIdx] ? parseFloat(cols[qtyIdx]) : 0;
      const rawDr = drIdx >= 0 && cols[drIdx] ? cols[drIdx] : `DR-${new Date().toISOString().slice(0, 10)}-${i}`;
      const rawDate = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
      const rawExpiry = expiryIdx >= 0 && cols[expiryIdx] ? cols[expiryIdx] : undefined;
      const rawSupp = supplierIdx >= 0 && cols[supplierIdx] ? cols[supplierIdx] : 'Direct Supplier';

      items.push({
        barcode: rawBarcode,
        quantity: isNaN(rawQty) ? 0 : rawQty,
        drNumber: rawDr,
        deliveryDate: rawDate,
        expirationDate: rawExpiry,
        supplier: rawSupp,
      });
    }

    return {
      items,
      successCount: items.length,
      warnings: [],
    };
  }

  /**
   * Generates Inventory CSV export
   */
  static exportInventoryCsv(stocks: Array<{ barcode: string; name: string; quantity: number; reorderLevel: number; drNumber?: string }>): string {
    const header = 'Barcode,ProductName,CurrentStock,ReorderLevel,LastDRNumber';
    const rows = stocks.map((s) => `"${s.barcode}","${s.name.replace(/"/g, '""')}","${s.quantity}","${s.reorderLevel}","${s.drNumber || 'N/A'}"`);
    return [header, ...rows].join('\r\n');
  }

  /**
   * Generic report to CSV exporter for all records views
   */
  static exportTableToCsv(reportTitle: string, headers: string[], rows: (string | number)[][]): string {
    const titleRow = `"${reportTitle} - Exported ${new Date().toLocaleString()}"`;
    const headerRow = headers.map((h) => `"${h}"`).join(',');
    const dataRows = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    return [titleRow, '', headerRow, ...dataRows].join('\r\n');
  }
}
