import { describe, it, expect } from 'vitest';
import { ExcelService } from './excelService';
import ExcelJS from 'exceljs';

describe('Excel Import/Export Engine', () => {
  it('generates a valid Product Catalog Excel template with expected headers', async () => {
    const buffer = await ExcelService.generateProductTemplate();
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    // Read back the buffer to verify structure
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('Products');
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe('SKU*');
    expect(sheet?.getRow(1).getCell(2).value).toBe('Barcode*');
    expect(sheet?.getRow(1).getCell(3).value).toBe('Product Name*');

    const guideSheet = workbook.getWorksheet('Instructions');
    expect(guideSheet).toBeDefined();
  });

  it('generates a valid Inventory Delivery Report template with expected columns', async () => {
    const buffer = await ExcelService.generateInventoryDeliveryTemplate();
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('Delivery Report');
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe('Delivery Report No.*');
    expect(sheet?.getRow(1).getCell(2).value).toBe('Date (YYYY-MM-DD)*');
    expect(sheet?.getRow(1).getCell(3).value).toBe('Branch Code*');
    expect(sheet?.getRow(1).getCell(4).value).toBe('Barcode or SKU*');
    expect(sheet?.getRow(1).getCell(6).value).toBe('Quantity Delivered*');
  });

  it('catches missing mandatory fields when importing invalid product rows', async () => {
    // Create an in-memory workbook with an invalid row (missing name and barcode)
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.addRow(['SKU*', 'Barcode*', 'Product Name*', 'Category Code*', 'Cost Price*', 'Selling Price*']);
    sheet.addRow(['SKU-ONLY', '', '', 'BEV', 10, 20]); // Missing barcode & name

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const result = await ExcelService.importProductsFromExcel(buffer);

    expect(result.totalRows).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Missing mandatory fields');
  });
});
