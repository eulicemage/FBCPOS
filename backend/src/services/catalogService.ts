import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CatalogService {
  static async getCatalogDelta(lastPulledAt?: string, branchId?: string) {
    const filterDate = lastPulledAt ? new Date(lastPulledAt) : new Date(0);

    const categories = await prisma.category.findMany({
      where: {
        updatedAt: { gt: filterDate },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const products = await prisma.product.findMany({
      where: {
        updatedAt: { gt: filterDate },
      },
      include: {
        category: true,
      },
    });

    const users = await prisma.user.findMany({
      where: {
        updatedAt: { gt: filterDate },
        ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        pinHash: true,
        branchId: true,
        isActive: true,
      },
    });

    return {
      syncedAt: new Date().toISOString(),
      categories,
      products,
      users,
    };
  }

  static async searchProducts(query: string, categoryId?: string) {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true },
      take: 50,
    });
  }

  static async getProductByBarcode(barcode: string) {
    return await prisma.product.findUnique({
      where: { barcode },
      include: { category: true },
    });
  }
}
