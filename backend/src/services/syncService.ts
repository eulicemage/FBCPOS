import { PrismaClient, SaleStatus, MovementType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SyncBatchItem {
  id: string;             // Queue record ID
  entityType: 'SALE' | 'STOCK_MOVEMENT' | 'SHIFT' | 'RETURN' | 'CASH_TX';
  entityId: string;       // Entity UUID
  operation: 'INSERT' | 'UPDATE';
  payload: any;           // Complete object
}

export class SyncService {
  static async processBatch(terminalId: string, branchId: string, batch: SyncBatchItem[]) {
    const syncedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of batch) {
      try {
        if (item.entityType === 'SALE') {
          await this.processSaleSync(branchId, terminalId, item.payload);
        } else if (item.entityType === 'STOCK_MOVEMENT') {
          await this.processStockMovementSync(branchId, item.payload);
        } else if (item.entityType === 'SHIFT') {
          await this.processShiftSync(branchId, terminalId, item.payload);
        }
        syncedIds.push(item.id);
      } catch (err: any) {
        logger.error(`Error processing sync item ${item.id} (${item.entityType}):`, err);
        errors.push({ id: item.id, error: err.message || 'Unknown sync error' });
      }
    }

    // Update terminal's last sync timestamp
    await prisma.terminal.update({
      where: { id: terminalId },
      data: { lastSyncAt: new Date() },
    }).catch((e) => logger.warn(`Could not update terminal lastSyncAt: ${e.message}`));

    return {
      status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      syncedCount: syncedIds.length,
      syncedIds,
      errors,
    };
  }

  private static async processSaleSync(branchId: string, terminalId: string, payload: any) {
    // Idempotency check: Does this sale ID already exist?
    const existing = await prisma.sale.findUnique({
      where: { id: payload.id },
    });

    if (existing) {
      // Already recorded, idempotently succeed
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Sale record
      await tx.sale.create({
        data: {
          id: payload.id,
          branchId,
          terminalId,
          cashierId: payload.cashierId,
          shiftId: payload.shiftId,
          invoiceNumber: payload.invoiceNumber,
          subtotalAmount: payload.subtotalAmount,
          discountType: payload.discountType || 'NONE',
          discountValue: payload.discountValue || 0,
          discountAmount: payload.discountAmount || 0,
          taxAmount: payload.taxAmount,
          totalAmount: payload.totalAmount,
          status: payload.status || SaleStatus.COMPLETED,
          customerName: payload.customerName,
          customerTinId: payload.customerTinId,
          notes: payload.notes,
          createdAt: new Date(payload.createdAt),
          syncedAt: new Date(),
          items: {
            create: payload.items.map((i: any) => ({
              id: i.id,
              productId: i.productId,
              sku: i.sku,
              barcode: i.barcode,
              productName: i.productName || i.name,
              costPrice: i.costPrice,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              discountAmount: i.discountAmount || 0,
              taxAmount: i.taxAmount || 0,
              totalAmount: i.total || i.totalAmount,
            })),
          },
          payments: {
            create: payload.payments.map((p: any) => ({
              id: p.id,
              paymentMethod: p.paymentMethod,
              amount: p.amount,
              amountTendered: p.amountTendered,
              changeAmount: p.changeAmount,
              referenceNumber: p.referenceNumber,
              createdAt: new Date(p.createdAt || payload.createdAt),
            })),
          },
        },
      });

      // 2. Adjust Cloud Inventory Balances
      for (const item of payload.items) {
        await tx.branchInventory.upsert({
          where: {
            branchId_productId: {
              branchId,
              productId: item.productId,
            },
          },
          update: {
            stockQuantity: { decrement: item.quantity },
          },
          create: {
            branchId,
            productId: item.productId,
            stockQuantity: -item.quantity,
          },
        });
      }
    });
  }

  private static async processStockMovementSync(branchId: string, payload: any) {
    const existing = await prisma.stockMovement.findUnique({
      where: { id: payload.id },
    });
    if (existing) return;

    await prisma.stockMovement.create({
      data: {
        id: payload.id,
        branchId,
        productId: payload.productId,
        terminalId: payload.terminalId,
        userId: payload.userId,
        movementType: payload.movementType as MovementType,
        quantityChange: payload.quantityChange,
        previousQuantity: payload.previousQuantity,
        newQuantity: payload.newQuantity,
        referenceId: payload.referenceId,
        reason: payload.reason,
        createdAt: new Date(payload.createdAt),
      },
    });
  }

  private static async processShiftSync(branchId: string, terminalId: string, payload: any) {
    await prisma.shift.upsert({
      where: { id: payload.id },
      update: {
        closedAt: payload.closedAt ? new Date(payload.closedAt) : undefined,
        actualCash: payload.actualCash,
        expectedCash: payload.expectedCash,
        cashDifference: payload.cashDifference,
        status: payload.status,
        notes: payload.notes,
      },
      create: {
        id: payload.id,
        branchId,
        terminalId,
        userId: payload.userId,
        shiftNumber: payload.shiftNumber,
        openedAt: new Date(payload.openedAt),
        closedAt: payload.closedAt ? new Date(payload.closedAt) : null,
        openingCash: payload.openingCash,
        expectedCash: payload.expectedCash,
        actualCash: payload.actualCash,
        cashDifference: payload.cashDifference,
        status: payload.status,
        notes: payload.notes,
      },
    });
  }
}
