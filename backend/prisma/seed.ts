import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FoodBaskets Corp (FBCPOS) database...');

  // 1. Password and PIN hashing
  const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const cashierPasswordHash = await bcrypt.hash('Cashier@123456', 10);
  // Default PIN '1234'
  const defaultPinHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // sha256('1234')

  // 2. Seed 18 Branches
  const branchesData = [
    { code: 'BR-001', name: 'Branch 001 - Downtown Flagship', address: '123 Rizal Ave, Manila', taxId: '100-001-000-000', terminalsCount: 2 },
    { code: 'BR-002', name: 'Branch 002 - Uptown Commercial', address: '456 Ayala Ave, Makati', taxId: '100-002-000-000', terminalsCount: 2 },
    { code: 'BR-003', name: 'Branch 003 - East Market Hub', address: '789 Ortigas Ave, Pasig', taxId: '100-003-000-000', terminalsCount: 2 },
    { code: 'BR-004', name: 'Branch 004 - West District', address: '101 Quezon Ave, Quezon City', taxId: '100-004-000-000', terminalsCount: 2 },
    ...Array.from({ length: 14 }, (_, i) => {
      const num = (i + 5).toString().padStart(3, '0');
      return {
        code: `BR-${num}`,
        name: `Branch ${num} - Community Store`,
        address: `Highway ${num}, Metro Region`,
        taxId: `100-${num}-000-000`,
        terminalsCount: 1,
      };
    }),
  ];

  for (const b of branchesData) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: {},
      create: {
        code: b.code,
        name: b.name,
        address: b.address,
        taxId: b.taxId,
      },
    });

    // Create Terminals
    for (let t = 1; t <= b.terminalsCount; t++) {
      const termNum = `T${t}`;
      const deviceUid = `DEV-${b.code}-${termNum}`;
      await prisma.terminal.upsert({
        where: { deviceUid },
        update: {},
        create: {
          branchId: branch.id,
          terminalNumber: termNum,
          deviceUid,
          name: `${branch.name} - Register ${t}`,
        },
      });
    }

    // Create Branch Manager and Cashier
    const branchNum = b.code.replace('BR-', '');
    await prisma.user.upsert({
      where: { username: `manager.${branchNum}` },
      update: {},
      create: {
        branchId: branch.id,
        username: `manager.${branchNum}`,
        fullName: `Manager ${b.code}`,
        passwordHash: defaultPasswordHash,
        pinHash: defaultPinHash,
        role: UserRole.MANAGER,
      },
    });

    await prisma.user.upsert({
      where: { username: `cashier.${branchNum}` },
      update: {},
      create: {
        branchId: branch.id,
        username: `cashier.${branchNum}`,
        fullName: `Cashier 1 (${b.code})`,
        passwordHash: cashierPasswordHash,
        pinHash: defaultPinHash,
        role: UserRole.CASHIER,
      },
    });
  }

  // 3. Create Super Admin & Auditor
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'System Administrator',
      passwordHash: defaultPasswordHash,
      pinHash: defaultPinHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: 'auditor' },
    update: {},
    create: {
      username: 'auditor',
      fullName: 'Internal Auditor',
      passwordHash: defaultPasswordHash,
      pinHash: defaultPinHash,
      role: UserRole.AUDITOR,
    },
  });

  // 4. Seed Product Categories
  const categories = [
    { code: 'BEV', name: 'Beverages', colorHex: '#3B82F6', sortOrder: 1 },
    { code: 'BAK', name: 'Bakery & Pastries', colorHex: '#F59E0B', sortOrder: 2 },
    { code: 'DAI', name: 'Dairy & Eggs', colorHex: '#10B981', sortOrder: 3 },
    { code: 'CAN', name: 'Canned & Dry Goods', colorHex: '#8B5CF6', sortOrder: 4 },
    { code: 'SNK', name: 'Snacks & Confectionery', colorHex: '#EC4899', sortOrder: 5 },
    { code: 'HOU', name: 'Household & Cleaning', colorHex: '#64748B', sortOrder: 6 },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    categoryMap.set(c.code, cat.id);
  }

  // 5. Seed Core Products
  const products = [
    { sku: 'BEV-001', barcode: '4800016601011', name: 'Fresh Whole Milk 1L', categoryCode: 'BEV', cost: 72.00, price: 95.00, uom: 'PCS' },
    { sku: 'BEV-002', barcode: '4800016601028', name: 'Orange Juice 1L Pure', categoryCode: 'BEV', cost: 85.00, price: 110.00, uom: 'PCS' },
    { sku: 'BEV-003', barcode: '4800016601035', name: 'Mineral Water 500ml', categoryCode: 'BEV', cost: 10.00, price: 20.00, uom: 'BOTTLE' },
    { sku: 'BAK-001', barcode: '4800026602012', name: 'Whole Wheat Loaf 500g', categoryCode: 'BAK', cost: 48.00, price: 65.00, uom: 'PACK' },
    { sku: 'BAK-002', barcode: '4800026602029', name: 'Butter Croissant 4s', categoryCode: 'BAK', cost: 80.00, price: 120.00, uom: 'BOX' },
    { sku: 'DAI-001', barcode: '4800036603013', name: 'Organic Brown Eggs 12s', categoryCode: 'DAI', cost: 110.00, price: 145.00, uom: 'TRAY' },
    { sku: 'DAI-002', barcode: '4800036603020', name: 'Cheddar Cheese Block 250g', categoryCode: 'DAI', cost: 90.00, price: 125.00, uom: 'PCS' },
    { sku: 'CAN-001', barcode: '4800046604014', name: 'Canned Tuna Flakes in Oil 180g', categoryCode: 'CAN', cost: 32.00, price: 45.00, uom: 'CAN' },
    { sku: 'CAN-002', barcode: '4800046604021', name: 'Premium Jasmine Rice 5kg', categoryCode: 'CAN', cost: 220.00, price: 280.00, uom: 'BAG' },
    { sku: 'SNK-001', barcode: '4800056605015', name: 'Potato Crisps Original 110g', categoryCode: 'SNK', cost: 35.00, price: 52.00, uom: 'PACK' },
  ];

  for (const p of products) {
    const catId = categoryMap.get(p.categoryCode)!;
    await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        categoryId: catId,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        costPrice: p.cost,
        sellingPrice: p.price,
        unitOfMeasure: p.uom,
        isTaxable: true,
        taxRate: 0.12,
      },
    });
  }

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
