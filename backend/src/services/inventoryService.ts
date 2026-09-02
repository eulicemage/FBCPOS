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
}
