import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaleService } from './saleService';
import { PrismaClient, SaleStatus } from '@prisma/client';

// We'll use mock for prisma
const prisma = new PrismaClient();

vi.mock('@prisma/client', () => {
  const mPrisma: any = {
    sale: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  mPrisma.$transaction = vi.fn((fn: any) => fn(mPrisma));
  return {
    PrismaClient: vi.fn(() => mPrisma),
    SaleStatus: {
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      REFUNDED: 'REFUNDED',
    },
  };
});

describe('SaleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSales', () => {
    it('should list sales with filters and pagination', async () => {
      const mockSales = [{ id: 'sale-1' }];
      (prisma.sale.count as any).mockResolvedValue(1);
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const filters = { branchId: 'branch-1', page: 2, limit: 10 };
      const result = await SaleService.listSales(filters);

      expect(prisma.sale.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-1' })
      }));
      expect(prisma.sale.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-1' }),
        skip: 10,
        take: 10,
        include: { items: true, payments: true },
        orderBy: { createdAt: 'desc' }
      }));
      expect(result.sales).toEqual(mockSales);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
    });
  });

  describe('getSaleById', () => {
    it('should return full relations for a given sale id', async () => {
      const mockSale = { id: 'sale-1', branch: {}, terminal: {}, cashier: {} };
      (prisma.sale.findUnique as any).mockResolvedValue(mockSale);

      const result = await SaleService.getSaleById('sale-1');

      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        include: {
          items: true,
          payments: true,
          branch: true,
          terminal: true,
          cashier: {
            select: { id: true, fullName: true, username: true },
          },
        },
      });
      expect(result).toEqual(mockSale);
    });

    it('should throw an error if sale not found', async () => {
      (prisma.sale.findUnique as any).mockResolvedValue(null);
      await expect(SaleService.getSaleById('invalid-id')).rejects.toThrow('Sale not found');
    });
  });

  describe('getDailySummary', () => {
    it('should calculate aggregated total sales, revenue, discount, tax and payment breakdown', async () => {
      const mockSales = [
        {
          id: 'sale-1',
          totalAmount: 100.0,
          discountAmount: 10.0,
          taxAmount: 12.0,
          payments: [{ paymentMethod: 'CASH', amount: 100.0 }]
        },
        {
          id: 'sale-2',
          totalAmount: 200.0,
          discountAmount: 0.0,
          taxAmount: 24.0,
          payments: [{ paymentMethod: 'CARD', amount: 200.0 }]
        }
      ];
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const dateStr = '2023-01-01T10:00:00.000Z';
      const result = await SaleService.getDailySummary('branch-1', dateStr);

      expect(prisma.sale.findMany).toHaveBeenCalled();
      expect(result.totalSales).toBe(2);
      expect(result.totalRevenue).toBe(300.0);
      expect(result.totalDiscount).toBe(10.0);
      expect(result.totalTax).toBe(36.0);
      expect(result.paymentMethods).toEqual({
        CASH: 100.0,
        CARD: 200.0,
      });
    });
  });

  describe('cancelSale', () => {
    it('should change status to CANCELLED and update notes', async () => {
      const mockSale = { id: 'sale-1', status: 'COMPLETED', notes: 'Some notes' };
      (prisma.sale.findUnique as any).mockResolvedValue(mockSale);
      (prisma.sale.update as any).mockResolvedValue({ ...mockSale, status: 'CANCELLED', notes: 'Some notes\n[CANCELLED by admin]: Wrong order' });

      const result = await SaleService.cancelSale('sale-1', 'Wrong order', 'admin');

      expect(prisma.sale.findUnique).toHaveBeenCalledWith({ where: { id: 'sale-1' } });
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: {
          status: 'CANCELLED',
          notes: expect.stringContaining('[CANCELLED by admin]: Wrong order'),
        },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw an error if already cancelled', async () => {
      const mockSale = { id: 'sale-1', status: 'CANCELLED' };
      (prisma.sale.findUnique as any).mockResolvedValue(mockSale);
      
      await expect(SaleService.cancelSale('sale-1', 'Reason', 'admin')).rejects.toThrow('Sale is already cancelled');
    });
  });
});
