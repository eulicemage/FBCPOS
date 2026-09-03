import { PrismaClient, SaleStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class SaleService {
  static async listSales(filters?: {
    branchId?: string;
    terminalId?: string;
    dateFrom?: string;
    dateTo?: string;
    cashierId?: string;
    status?: SaleStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.terminalId) where.terminalId = filters.terminalId;
    if (filters?.cashierId) where.cashierId = filters.cashierId;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sales,
    };
  }

  static async getSaleById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
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

    if (!sale) {
      throw new Error('Sale not found');
    }

    return sale;
  }

  static async getDailySummary(branchId?: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    // Start of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    // End of day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: SaleStatus.COMPLETED,
    };
    if (branchId) {
      where.branchId = branchId;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { payments: true },
    });

    const totalSales = sales.length;
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const paymentMethods: Record<string, number> = {};

    for (const sale of sales) {
      totalRevenue += Number(sale.totalAmount);
      totalDiscount += Number(sale.discountAmount);
      totalTax += Number(sale.taxAmount);

      for (const payment of sale.payments) {
        if (!paymentMethods[payment.paymentMethod]) {
          paymentMethods[payment.paymentMethod] = 0;
        }
        paymentMethods[payment.paymentMethod] += Number(payment.amount);
      }
    }

    return {
      totalSales,
      totalRevenue,
      totalDiscount,
      totalTax,
      paymentMethods,
    };
  }

  static async cancelSale(id: string, reason: string, cancelledBy: string) {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id } });
      if (!sale) {
        throw new Error('Sale not found');
      }
      if (sale.status === SaleStatus.CANCELLED) {
        throw new Error('Sale is already cancelled');
      }

      const appendNotes = sale.notes ? `${sale.notes}\n[CANCELLED by ${cancelledBy}]: ${reason}` : `[CANCELLED by ${cancelledBy}]: ${reason}`;

      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELLED,
          notes: appendNotes,
        },
      });

      return updatedSale;
    });
  }
}
