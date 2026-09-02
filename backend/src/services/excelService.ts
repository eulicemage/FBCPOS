import ExcelJS from 'exceljs';
import { PrismaClient, MovementType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ExcelImportResult {
  totalRows: number;
  successful: number;
  insertedCount: number;
  updatedCount: number;
  errors: Array<{ row: number; item?: string; message: string }>;
}

export interface InventoryDeliveryImportResult {
  totalRows: number;
  successful: number;
  totalQuantity: number;
  errors: Array<{ row: number; item?: string; message: string }>;
}

export class ExcelService {
  /**
   * Generate downloadable Product Catalog Import Template (.xlsx)
   */
  static async generateProductTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FoodBaskets Corp POS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'SKU*', key: 'sku', width: 16 },
      { header: 'Barcode*', key: 'barcode', width: 20 },
      { header: 'Product Name*', key: 'name', width: 32 },
      { header: 'Category Code*', key: 'categoryCode', width: 16 },
      { header: 'Cost Price*', key: 'costPrice', width: 14 },
      { header: 'Selling Price*', key: 'sellingPrice', width: 14 },
      { header: 'Taxable (YES/NO)', key: 'isTaxable', width: 16 },
      { header: 'Tax Rate (%)', key: 'taxRate', width: 14 },
      { header: 'Unit of Measure', key: 'uom', width: 16 },
      { header: 'Active (YES/NO)', key: 'isActive', width: 16 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sample template rows
    sheet.addRow({
      sku: 'BEV-001',
      barcode: '4800016601011',
      name: 'Fresh Whole Milk 1L',
      categoryCode: 'BEV',
      costPrice: 72.0,
      sellingPrice: 95.0,
      isTaxable: 'YES',
      taxRate: 12,
      uom: 'PCS',
      isActive: 'YES',
    });
    sheet.addRow({
      sku: 'BAK-001',
      barcode: '4800026602012',
      name: 'Whole Wheat Loaf 500g',
      categoryCode: 'BAK',
      costPrice: 48.0,
      sellingPrice: 65.0,
      isTaxable: 'YES',
      taxRate: 12,
      uom: 'PACK',
      isActive: 'YES',
    });

    // Add Instructions sheet
    const guideSheet = workbook.addWorksheet('Instructions');
    guideSheet.columns = [
      { header: 'Field', key: 'field', width: 22 },
      { header: 'Description & Requirements', key: 'desc', width: 60 },
    ];
    guideSheet.getRow(1).font = { bold: true };
    guideSheet.addRow({ field: 'SKU*', desc: 'Unique item code (e.g. BEV-001). Must not duplicate existing SKUs.' });
    guideSheet.addRow({ field: 'Barcode*', desc: 'Primary scanner barcode (e.g. 13-digit EAN-13, UPC, Code 128).' });
    guideSheet.addRow({ field: 'Product Name*', desc: 'Official product description displayed on cashier screen & receipt.' });
    guideSheet.addRow({ field: 'Category Code*', desc: 'Category abbreviation (e.g. BEV, BAK, DAI, CAN, SNK, HOU).' });
    guideSheet.addRow({ field: 'Cost Price*', desc: 'Wholesale acquisition cost in PHP (e.g. 72.00).' });
    guideSheet.addRow({ field: 'Selling Price*', desc: 'Retail POS selling price including VAT in PHP (e.g. 95.00).' });
    guideSheet.addRow({ field: 'Taxable', desc: 'YES or NO (Standard grocery items are YES for 12% VAT).' });
    guideSheet.addRow({ field: 'Tax Rate (%)', desc: 'Percentage rate (default is 12).' });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Bulk import products from uploaded Excel file buffer
   */
  static async importProductsFromExcel(buffer: Buffer): Promise<ExcelImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('Products') || workbook.worksheets[0];
    if (!sheet) {
      throw new Error('Spreadsheet does not contain a valid worksheet');
    }

    const errors: Array<{ row: number; item?: string; message: string }> = [];
    let insertedCount = 0;
    let updatedCount = 0;
    let totalRows = 0;

    // Collect and validate all rows
    const rowsToProcess: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const sku = row.getCell(1).text?.trim();
      const barcode = row.getCell(2).text?.trim();
      const name = row.getCell(3).text?.trim();
      const categoryCode = row.getCell(4).text?.trim()?.toUpperCase();
      const costPriceVal = row.getCell(5).value;
      const sellingPriceVal = row.getCell(6).value;
      const isTaxableStr = row.getCell(7).text?.trim()?.toUpperCase();
      const taxRateVal = row.getCell(8).value;
      const uom = row.getCell(9).text?.trim() || 'PCS';
      const isActiveStr = row.getCell(10).text?.trim()?.toUpperCase();

      if (!sku && !barcode && !name) {
        return; // Skip empty row
      }

      totalRows++;

      if (!sku || !barcode || !name) {
        errors.push({
          row: rowNumber,
          item: barcode || sku || `Row ${rowNumber}`,
          message: 'Missing mandatory fields (SKU, Barcode, or Product Name)',
        });
        return;
      }

      const costPrice = parseFloat(String(costPriceVal ?? 0));
      const sellingPrice = parseFloat(String(sellingPriceVal ?? 0));

      if (isNaN(costPrice) || costPrice < 0 || isNaN(sellingPrice) || sellingPrice < 0) {
        errors.push({
          row: rowNumber,
          item: barcode,
          message: 'Invalid cost or selling price numbers',
        });
        return;
      }

      rowsToProcess.push({
        rowNumber,
        sku,
        barcode,
        name,
        categoryCode: categoryCode || 'GEN',
        costPrice,
        sellingPrice,
        isTaxable: isTaxableStr !== 'NO',
        taxRate: taxRateVal ? parseFloat(String(taxRateVal)) / 100 : 0.12,
        uom,
        isActive: isActiveStr !== 'NO',
      });
    });

    if (rowsToProcess.length === 0) {
      return {
        totalRows,
        successful: 0,
        insertedCount: 0,
        updatedCount: 0,
        errors,
      };
    }

    // Pre-fetch all categories for rapid lookup
    const existingCategories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>(
      existingCategories.map((c) => [c.code.toUpperCase(), c.id])
    );

    // Process rows into database
    for (const item of rowsToProcess) {
      try {
        // Resolve or create category if missing
        let categoryId = categoryMap.get(item.categoryCode);
        if (!categoryId) {
          const newCat = await prisma.category.create({
            data: {
              code: item.categoryCode,
              name: item.categoryCode,
              colorHex: '#3B82F6',
            },
          });
          categoryId = newCat.id;
          categoryMap.set(item.categoryCode, categoryId);
        }

        const existing = await prisma.product.findFirst({
          where: {
            OR: [{ barcode: item.barcode }, { sku: item.sku }],
          },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              categoryId,
              name: item.name,
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice,
              isTaxable: item.isTaxable,
              taxRate: item.taxRate,
              unitOfMeasure: item.uom,
              isActive: item.isActive,
            },
          });
          updatedCount++;
        } else {
          await prisma.product.create({
            data: {
              categoryId,
              sku: item.sku,
              barcode: item.barcode,
              name: item.name,
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice,
              isTaxable: item.isTaxable,
              taxRate: item.taxRate,
              unitOfMeasure: item.uom,
              isActive: item.isActive,
            },
          });
          insertedCount++;
        }
      } catch (err: any) {
        errors.push({
          row: item.rowNumber,
          item: item.barcode,
          message: err.message || 'Database error while inserting product',
        });
      }
    }

    return {
      totalRows,
      successful: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      errors,
    };
  }

  /**
   * Export entire Product Catalog to Excel (.xlsx)
   */
  static async exportProductsToExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Product Catalog');

    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Product Name', key: 'name', width: 34 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Cost Price (PHP)', key: 'costPrice', width: 16 },
      { header: 'Selling Price (PHP)', key: 'sellingPrice', width: 18 },
      { header: 'Taxable', key: 'isTaxable', width: 12 },
      { header: 'Tax Rate', key: 'taxRate', width: 12 },
      { header: 'UOM', key: 'uom', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created Date', key: 'createdAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' },
    };

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    for (const p of products) {
      sheet.addRow({
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category.name,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        isTaxable: p.isTaxable ? 'YES' : 'NO',
        taxRate: `${Number(p.taxRate) * 100}%`,
        uom: p.unitOfMeasure,
        status: p.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: p.createdAt.toISOString().split('T')[0],
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Generate downloadable Inventory Delivery Report (DR) Template (.xlsx)
   */
  static async generateInventoryDeliveryTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FoodBaskets Corp POS';

    const sheet = workbook.addWorksheet('Delivery Report', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Delivery Report No.*', key: 'drNumber', width: 24 },
      { header: 'Date (YYYY-MM-DD)*', key: 'date', width: 18 },
      { header: 'Branch Code*', key: 'branchCode', width: 16 },
      { header: 'Barcode or SKU*', key: 'identifier', width: 20 },
      { header: 'Product Name (Reference)', key: 'productName', width: 32 },
      { header: 'Quantity Delivered*', key: 'quantity', width: 18 },
      { header: 'Unit Cost Price (PHP)', key: 'unitCost', width: 20 },
      { header: 'Supplier / Delivery Notes', key: 'notes', width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' }, // Emerald theme for inventory
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sample delivery rows
    sheet.addRow({
      drNumber: 'DR-2026-0901',
      date: '2026-09-02',
      branchCode: 'BR-001',
      identifier: '4800016601011',
      productName: 'Fresh Whole Milk 1L',
      quantity: 120,
      unitCost: 72.0,
      notes: 'Weekly fresh dairy delivery from Magnolia',
    });
    sheet.addRow({
      drNumber: 'DR-2026-0901',
      date: '2026-09-02',
      branchCode: 'BR-001',
      identifier: '4800026602012',
      productName: 'Whole Wheat Loaf 500g',
      quantity: 50,
      unitCost: 48.0,
      notes: 'Gardenia daily bread delivery',
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Bulk import inventory stock-in deliveries from Excel buffer.
   * Atomically updates branch_inventory and inserts immutable stock_movements records.
   */
  static async importInventoryDeliveryFromExcel(
    buffer: Buffer,
    authorUserId: string
  ): Promise<InventoryDeliveryImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('Delivery Report') || workbook.worksheets[0];
    if (!sheet) {
      throw new Error('Spreadsheet missing valid delivery worksheet');
    }

    const errors: Array<{ row: number; item?: string; message: string }> = [];
    const validRows: any[] = [];
    let totalRows = 0;
    let totalQuantity = 0;

    // Cache branches and products for fast lookup
    const branches = await prisma.branch.findMany({ select: { id: true, code: true } });
    const branchMap = new Map<string, string>(branches.map((b) => [b.code.toUpperCase(), b.id]));

    const products = await prisma.product.findMany({ select: { id: true, barcode: true, sku: true, name: true } });
    const productLookup = new Map<string, { id: string; name: string }>();
    for (const p of products) {
      productLookup.set(p.barcode, { id: p.id, name: p.name });
      productLookup.set(p.sku.toUpperCase(), { id: p.id, name: p.name });
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const drNumber = row.getCell(1).text?.trim();
      const dateVal = row.getCell(2).text?.trim();
      const branchCode = row.getCell(3).text?.trim()?.toUpperCase();
      const identifier = row.getCell(4).text?.trim();
      const quantityVal = row.getCell(6).value;
      const unitCostVal = row.getCell(7).value;
      const notes = row.getCell(8).text?.trim();

      if (!drNumber && !identifier) return;

      totalRows++;

      if (!drNumber || !branchCode || !identifier || quantityVal === null || quantityVal === undefined) {
        errors.push({
          row: rowNumber,
          item: identifier || drNumber,
          message: 'Missing mandatory DR No, Branch Code, Barcode/SKU, or Quantity',
        });
        return;
      }

      const branchId = branchMap.get(branchCode);
      if (!branchId) {
        errors.push({
          row: rowNumber,
          item: branchCode,
          message: `Branch code '${branchCode}' does not exist in system`,
        });
        return;
      }

      const product = productLookup.get(identifier) || productLookup.get(identifier.toUpperCase());
      if (!product) {
        errors.push({
          row: rowNumber,
          item: identifier,
          message: `Product barcode or SKU '${identifier}' not found in master catalog`,
        });
        return;
      }

      const qty = parseFloat(String(quantityVal));
      if (isNaN(qty) || qty <= 0) {
        errors.push({
          row: rowNumber,
          item: identifier,
          message: `Quantity must be a valid positive number`,
        });
        return;
      }

      validRows.push({
        rowNumber,
        drNumber,
        date: dateVal ? new Date(dateVal) : new Date(),
        branchId,
        productId: product.id,
        quantity: qty,
        unitCost: unitCostVal ? parseFloat(String(unitCostVal)) : undefined,
        notes: notes || `Stock delivery under ${drNumber}`,
      });
    });

    if (validRows.length === 0) {
      return {
        totalRows,
        successful: 0,
        totalQuantity: 0,
        errors,
      };
    }

    // Execute atomic delivery batch inside Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        // 1. Fetch current inventory level
        const currentInv = await tx.branchInventory.findUnique({
          where: {
            branchId_productId: {
              branchId: row.branchId,
              productId: row.productId,
            },
          },
        });

        const prevQty = currentInv ? Number(currentInv.stockQuantity) : 0;
        const newQty = prevQty + row.quantity;

        // 2. Upsert branch_inventory
        await tx.branchInventory.upsert({
          where: {
            branchId_productId: {
              branchId: row.branchId,
              productId: row.productId,
            },
          },
          update: { stockQuantity: newQty },
          create: {
            branchId: row.branchId,
            productId: row.productId,
            stockQuantity: newQty,
          },
        });

        // 3. Create immutable stock movement record
        await tx.stockMovement.create({
          data: {
            branchId: row.branchId,
            productId: row.productId,
            userId: authorUserId,
            movementType: MovementType.STOCK_IN,
            quantityChange: row.quantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            referenceId: row.drNumber,
            reason: row.notes,
            createdAt: row.date,
          },
        });

        totalQuantity += row.quantity;
      }
    });

    return {
      totalRows,
      successful: validRows.length,
      totalQuantity,
      errors,
    };
  }

  /**
   * Export Branch Inventory Status to Excel (.xlsx)
   */
  static async exportInventoryToExcel(branchId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Balances');

    sheet.columns = [
      { header: 'Branch Code', key: 'branchCode', width: 14 },
      { header: 'Branch Name', key: 'branchName', width: 28 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Product Name', key: 'name', width: 34 },
      { header: 'Stock Quantity', key: 'qty', width: 16 },
      { header: 'Reorder Level', key: 'reorder', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Last Updated', key: 'updatedAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' },
    };

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new Error('Branch not found');
    }

    const inventory = await prisma.branchInventory.findMany({
      where: { branchId },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });

    for (const item of inventory) {
      const qty = Number(item.stockQuantity);
      const reorder = Number(item.reorderLevel);
      const status = qty <= 0 ? 'OUT OF STOCK' : qty <= reorder ? 'LOW STOCK' : 'OPTIMAL';

      sheet.addRow({
        branchCode: branch.code,
        branchName: branch.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        name: item.product.name,
        qty,
        reorder,
        status,
        updatedAt: item.updatedAt.toISOString().split('T')[0],
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
