import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimestampMiddleware implements NestMiddleware {
  private readonly MINUTE_TO_REJECT = 1;
  use(req: Request, res: Response, next: NextFunction) {
    const timestamp = req.headers['timestamp'] as string;

    if (!timestamp) {
      return res
        .status(401)
        .json({ message: 'Unauthorized due to missing timestamp.' });
    }
    const currentTime = new Date().getTime();
    const requestTime = new Date(timestamp).getTime();
    if (
      Math.floor((currentTime - requestTime) / 60000) < this.MINUTE_TO_REJECT
    ) {
      next();
    } else {
      return res.status(401).json({ message: 'Invalid timestamp' });
    }
  }
}
