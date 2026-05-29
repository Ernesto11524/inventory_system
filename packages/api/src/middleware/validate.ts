import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/response';

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const message = err.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new ValidationError(message);
      }
      throw err;
    }
  };
}
