import { Router } from 'express';
import multer from 'multer';
import { ExcelController } from '../controllers/excelController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are permitted'));
    }
  },
});

export const excelRouter = Router();

// Templates can be downloaded by Admin and Branch Managers
excelRouter.get('/templates/products', ExcelController.downloadProductTemplate);
excelRouter.get('/templates/inventory-delivery', ExcelController.downloadInventoryDeliveryTemplate);

// Protected Import / Export routes
excelRouter.use(authenticate);

// Product Catalog Bulk Import / Export (Admin & Manager)
excelRouter.post(
  '/import/products',
  authorize(['ADMIN', 'MANAGER']),
  upload.single('file'),
  ExcelController.importProducts
);
excelRouter.get(
  '/export/products',
  authorize(['ADMIN', 'MANAGER', 'AUDITOR']),
  ExcelController.exportProducts
);

// Inventory Delivery Report Import / Export (Admin & Manager)
excelRouter.post(
  '/import/inventory-delivery',
  authorize(['ADMIN', 'MANAGER']),
  upload.single('file'),
  ExcelController.importInventoryDelivery
);
excelRouter.get(
  '/export/inventory/:branchId',
  authorize(['ADMIN', 'MANAGER', 'AUDITOR']),
  ExcelController.exportInventory
);

