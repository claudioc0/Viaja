import type { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';

export class PaymentsController {
  async create(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.processSimulatedPayment(req.user!, req.body);
    res.status(201).json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const payment = await paymentsService.getPaymentById(String(req.params.id), req.user!);
    res.status(200).json({ payment });
  }
}

export const paymentsController = new PaymentsController();
