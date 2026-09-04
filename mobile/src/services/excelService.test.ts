import { describe, it, expect } from "vitest";
import { ExcelService } from "./excelService";

describe("ExcelService", () => {
  it("parses products CSV with relaxed optional fields without throwing errors", () => {
    const csv = `Barcode,Name,SellingPrice,CostPrice\n4800016601011,Fresh Whole Milk 1L,95.00,72.00\n4800016601028,Orange Juice 1L,110.00,85.00`;
    const result = ExcelService.parseProductsCsv(csv);
    expect(result.successCount).toBe(2);
    expect(result.items[0].barcode).toBe("4800016601011");
    expect(result.items[0].sellingPrice).toBe(95);
    expect(result.items[0].wholesalePrice).toBeCloseTo(85.5); // auto 90% when not provided
    expect(result.items[0].unitOfMeasure).toBe("PCS"); // default
  });

  it("handles messy CSV rows with missing columns gracefully", () => {
    const csv = `Code,Title\n123456,Incomplete Item`;
    const result = ExcelService.parseProductsCsv(csv);
    expect(result.successCount).toBe(1);
    expect(result.items[0].barcode).toBe("123456");
    expect(result.items[0].name).toBe("Incomplete Item");
    expect(result.items[0].sellingPrice).toBe(0);
  });

  it("parses inventory CSV and extracts Delivery Report Number (DR#)", () => {
    const csv = `Barcode,Qty,DR Number,Delivery Date\n4800016601011,50,DR-2026-0901,2026-09-01\n4800016601028,25,DR-2026-0902,2026-09-02`;
    const result = ExcelService.parseInventoryCsv(csv);
    expect(result.successCount).toBe(2);
    expect(result.items[0].drNumber).toBe("DR-2026-0901");
    expect(result.items[0].quantity).toBe(50);
  });

  it("exports generic report tables to standard CSV format", () => {
    const headers = ["Terminal", "Transactions", "Total Sales"];
    const rows = [
      ["T1", 42, "₱15,240.00"],
      ["T2", 18, "₱6,800.00"],
    ];
    const csv = ExcelService.exportTableToCsv("Terminal Sales Report", headers, rows);
    expect(csv).toContain("Terminal Sales Report");
    expect(csv).toContain('"Terminal","Transactions","Total Sales"');
    expect(csv).toContain('"T1","42","₱15,240.00"');
  });
});
