// src/middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('Request Info:', {
      method: req.method, // GET, POST, etc.
      url: req.originalUrl, // The requested URL
      headers: req.headers, // Request headers
    });
    next();
  }
}
