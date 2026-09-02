import { PrismaClient, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryService {
  static async getBranchInventory(branchId: string) {
    return await prisma.branchInventory.findMany({
      where: { branchId },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  static async recordMovement(
    branchId: string,
    productId: string,
    movementType: MovementType,
    quantityChange: number,
    userId: string,
    reason?: string,
    referenceId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.branchInventory.findUnique({
        where: {
          branchId_productId: { branchId, productId },
        },
      });

      const previousQuantity = current ? Number(current.stockQuantity) : 0;
      const newQuantity = previousQuantity + quantityChange;

      await tx.branchInventory.upsert({
        where: {
          branchId_productId: { branchId, productId },
        },
        update: { stockQuantity: newQuantity },
        create: {
          branchId,
          productId,
          stockQuantity: newQuantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          branchId,
          productId,
          userId,
          movementType,
          quantityChange,
          previousQuantity,
          newQuantity,
          reason,
          referenceId,
        },
      });

      return movement;
    });
  }

  static async recordStockIn(
    branchId: string,
    productId: string,
    quantity: number,
    userId: string,
    referenceId?: string,
    notes?: string
  ) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    return await this.recordMovement(
      branchId,
      productId,
      MovementType.STOCK_IN,
      quantity,
      userId,
      notes || 'Manual stock in receipt',
      referenceId
    );
  }

  static async recordStockOut(
    branchId: string,
    productId: string,
    quantity: number,
    userId: string,
    referenceId?: string,
    reason?: string
  ) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    return await this.recordMovement(
      branchId,
      productId,
      MovementType.STOCK_OUT,
      -quantity,
      userId,
      reason || 'Stock dispatch / out',
      referenceId
    );
  }

  static async recordAdjustment(
    branchId: string,
    productId: string,
    countedQuantity: number,
    userId: string,
    reason: string
  ) {
    if (countedQuantity < 0) throw new Error('Counted physical stock cannot be negative');

    return await prisma.$transaction(async (tx) => {
      const current = await tx.branchInventory.findUnique({
        where: {
          branchId_productId: { branchId, productId },
        },
      });

      const previousQuantity = current ? Number(current.stockQuantity) : 0;
      const variance = countedQuantity - previousQuantity;

      await tx.branchInventory.upsert({
        where: {
          branchId_productId: { branchId, productId },
        },
        update: { stockQuantity: countedQuantity },
        create: {
          branchId,
          productId,
          stockQuantity: countedQuantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          branchId,
          productId,
          userId,
          movementType: MovementType.ADJUSTMENT_AUDIT,
          quantityChange: variance,
          previousQuantity,
          newQuantity: countedQuantity,
          reason: `Physical count adjustment (${variance >= 0 ? '+' : ''}${variance}): ${reason}`,
        },
        include: { product: true, user: true },
      });

      return { movement, previousQuantity, newQuantity: countedQuantity, variance };
    });
  }

  static async recordDamage(
    branchId: string,
    productId: string,
    quantity: number,
    userId: string,
    damageReason: string
  ) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    return await this.recordMovement(
      branchId,
      productId,
      MovementType.ADJUSTMENT_DAMAGE,
      -quantity,
      userId,
      `Damage/Spoilage write-off: ${damageReason}`
    );
  }

  static async getMovementHistory(
    branchId: string,
    filters?: {
      productId?: string;
      movementType?: MovementType;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { branchId };
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.movementType) where.movementType = filters.movementType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { sku: true, barcode: true, name: true, unitOfMeasure: true } },
          user: { select: { fullName: true, role: true } },
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
      movements,
    };
  }

  static async getReorderAlerts(branchId: string) {
    const items = await prisma.branchInventory.findMany({
      where: { branchId },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    // Filter items where stockQuantity <= reorderLevel
    return items
      .filter((item) => Number(item.stockQuantity) <= Number(item.reorderLevel))
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        category: item.product.category.name,
        stockQuantity: Number(item.stockQuantity),
        reorderLevel: Number(item.reorderLevel),
        status: Number(item.stockQuantity) <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      }));
  }
}
