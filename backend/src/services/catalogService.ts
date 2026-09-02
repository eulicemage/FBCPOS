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

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        branchInventory: {
          include: { branch: true },
        },
      },
    });
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  static async createProduct(data: {
    sku: string;
    barcode: string;
    name: string;
    categoryId: string;
    costPrice: number;
    sellingPrice: number;
    description?: string;
    isTaxable?: boolean;
    taxRate?: number;
    unitOfMeasure?: string;
  }) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode },
    });
    if (existingBarcode) {
      throw new Error(`Product with barcode '${data.barcode}' already exists`);
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new Error(`Product with SKU '${data.sku}' already exists`);
    }

    return await prisma.product.create({
      data: {
        categoryId: data.categoryId,
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        isTaxable: data.isTaxable !== false,
        taxRate: data.taxRate ?? 0.12,
        unitOfMeasure: data.unitOfMeasure || 'PCS',
        isActive: true,
      },
      include: { category: true },
    });
  }

  static async updateProduct(
    id: string,
    data: {
      categoryId?: string;
      sku?: string;
      barcode?: string;
      name?: string;
      description?: string;
      costPrice?: number;
      sellingPrice?: number;
      isTaxable?: boolean;
      taxRate?: number;
      unitOfMeasure?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Product not found');
    }

    if (data.barcode && data.barcode !== existing.barcode) {
      const barcodeCheck = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (barcodeCheck) throw new Error(`Barcode '${data.barcode}' is already in use`);
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuCheck = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuCheck) throw new Error(`SKU '${data.sku}' is already in use`);
    }

    return await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  static async deactivateProduct(id: string) {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
