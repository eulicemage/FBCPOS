import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CategoryService {
  static async listCategories(includeInactive: boolean = false) {
    return await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  static async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          take: 50,
        },
      },
    });
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  }

  static async createCategory(data: {
    name: string;
    code: string;
    colorHex?: string;
    sortOrder?: number;
  }) {
    const existing = await prisma.category.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new Error(`Category code '${data.code}' already exists`);
    }

    return await prisma.category.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        colorHex: data.colorHex || '#3B82F6',
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  static async updateCategory(
    id: string,
    data: {
      name?: string;
      code?: string;
      colorHex?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Category not found');
    }

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const codeCheck = await prisma.category.findUnique({
        where: { code: data.code.toUpperCase() },
      });
      if (codeCheck) {
        throw new Error(`Category code '${data.code}' already in use`);
      }
    }

    return await prisma.category.update({
      where: { id },
      data: {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
      },
    });
  }

  static async deactivateCategory(id: string) {
    return await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
