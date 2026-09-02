import { Router } from 'express';
import { SyncController } from '../controllers/syncController';

export const syncRouter = Router();

syncRouter.post('/push', SyncController.push);
