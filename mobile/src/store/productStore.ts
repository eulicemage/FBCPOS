import { create } from 'zustand';
import { Product } from '../../../shared/src';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: '1', code: 'ALL', name: 'All Items' },
  { id: '2', code: 'BEV', name: 'Beverages' },
  { id: '3', code: 'BAK', name: 'Bakery' },
  { id: '4', code: 'DAI', name: 'Dairy & Eggs' },
  { id: '5', code: 'CAN', name: 'Canned Goods' },
  { id: '6', code: 'SNK', name: 'Snacks' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    categoryId: '2',
    sku: 'BEV-001',
    barcode: '4800016601011',
    name: 'Fresh Whole Milk 1L',
    costPrice: 72.0,
    sellingPrice: 95.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PCS',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    categoryId: '2',
    sku: 'BEV-002',
    barcode: '4800016601028',
    name: 'Orange Juice 1L Pure',
    costPrice: 85.0,
    sellingPrice: 110.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PCS',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    categoryId: '3',
    sku: 'BAK-001',
    barcode: '4800026602012',
    name: 'Whole Wheat Loaf 500g',
    costPrice: 48.0,
    sellingPrice: 65.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'PACK',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p4',
    categoryId: '4',
    sku: 'DAI-001',
    barcode: '4800036603013',
    name: 'Organic Brown Eggs 12s',
    costPrice: 110.0,
    sellingPrice: 145.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'TRAY',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p5',
    categoryId: '5',
    sku: 'CAN-001',
    barcode: '4800046604014',
    name: 'Canned Tuna Flakes 180g',
    costPrice: 32.0,
    sellingPrice: 45.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'CAN',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p6',
    categoryId: '6',
    sku: 'SNK-001',
    barcode: '4800056605015',
    name: 'Potato Crisps Salted 100g',
    costPrice: 28.0,
    sellingPrice: 38.0,
    isTaxable: true,
    taxRate: 0.12,
    unitOfMeasure: 'POUCH',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface AddProductInput {
  name: string;
  barcode?: string;
  sku?: string;
  categoryId?: string;
  costPrice?: number;
  sellingPrice: number;
  unitOfMeasure?: string;
  isTaxable?: boolean;
  taxRate?: number;
  description?: string;
}

interface ProductStoreState {
  products: Product[];
  categories: CategoryItem[];
  selectedCategory: string;

  setSelectedCategory: (code: string) => void;
  addProduct: (input: AddProductInput) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (code: string, name: string) => CategoryItem;
  findProductByBarcode: (barcode: string) => Product | undefined;
  resetToDefaults: () => void;
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  products: INITIAL_PRODUCTS,
  categories: INITIAL_CATEGORIES,
  selectedCategory: 'ALL',

  setSelectedCategory: (code: string) => set({ selectedCategory: code }),

  addProduct: (input: AddProductInput) => {
    const id = uuidv4();
    const barcode = input.barcode?.trim() || `GEN-${Date.now().toString().slice(-8)}`;
    const sku = input.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newProduct: Product = {
      id,
      categoryId: input.categoryId || '2',
      sku,
      barcode,
      name: input.name.trim(),
      description: input.description,
      costPrice: input.costPrice || 0,
      sellingPrice: input.sellingPrice,
      isTaxable: input.isTaxable !== false,
      taxRate: input.taxRate !== undefined ? input.taxRate : 0.12,
      unitOfMeasure: input.unitOfMeasure || 'PCS',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      products: [newProduct, ...state.products],
    }));

    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  deleteProduct: (id: string) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  addCategory: (code: string, name: string) => {
    const newCategory: CategoryItem = {
      id: uuidv4(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
    };
    set((state) => ({
      categories: [...state.categories, newCategory],
    }));
    return newCategory;
  },

  findProductByBarcode: (barcode: string) => {
    const cleaned = barcode.trim();
    return get().products.find((p) => p.barcode === cleaned && p.isActive);
  },

  resetToDefaults: () => {
    set({
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      selectedCategory: 'ALL',
    });
  },
}));

