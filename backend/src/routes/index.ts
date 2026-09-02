import { Router } from 'express';
import { authRouter } from './authRoutes';
import { catalogRouter } from './catalogRoutes';
import { syncRouter } from './syncRoutes';
import { inventoryRouter } from './inventoryRoutes';
import { userRouter } from './userRoutes';
import { excelRouter } from './excelRoutes';
import { categoryRouter } from './categoryRoutes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/excel', excelRouter);

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'FBCPOS Cloud Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});
