import { describe, it, expect, beforeEach } from 'vitest';
import { useProductStore } from './productStore';

describe('ProductStore', () => {
  beforeEach(() => {
    useProductStore.getState().resetToDefaults();
  });

  it('initializes with default products and categories', () => {
    const { products, categories } = useProductStore.getState();
    expect(products.length).toBeGreaterThanOrEqual(6);
    expect(categories.length).toBe(6);
  });

  it('dynamically adds a new product', () => {
    const newProduct = useProductStore.getState().addProduct({
      name: 'Pandesal 10s',
      barcode: '480009990001',
      sellingPrice: 40.0,
      costPrice: 25.0,
      categoryId: '3',
      unitOfMeasure: 'PACK',
    });

    expect(newProduct.id).toBeDefined();
    expect(newProduct.name).toBe('Pandesal 10s');
    expect(newProduct.sellingPrice).toBe(40.0);

    const found = useProductStore.getState().findProductByBarcode('480009990001');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Pandesal 10s');
  });

  it('auto-generates barcode and SKU if not provided', () => {
    const newProduct = useProductStore.getState().addProduct({
      name: 'Artisan Sourdough',
      sellingPrice: 120.0,
    });

    expect(newProduct.barcode).toMatch(/^GEN-/);
    expect(newProduct.sku).toMatch(/^SKU-/);
  });

  it('updates an existing product', () => {
    const p1 = useProductStore.getState().products[0];
    useProductStore.getState().updateProduct(p1.id, {
      sellingPrice: 105.0,
    });

    const updated = useProductStore.getState().products.find((p) => p.id === p1.id);
    expect(updated?.sellingPrice).toBe(105.0);
  });

  it('adds a new category', () => {
    const cat = useProductStore.getState().addCategory('FRU', 'Fresh Produce');
    expect(cat.code).toBe('FRU');
    expect(cat.name).toBe('Fresh Produce');

    const categories = useProductStore.getState().categories;
    expect(categories.some((c) => c.code === 'FRU')).toBe(true);
  });
});
