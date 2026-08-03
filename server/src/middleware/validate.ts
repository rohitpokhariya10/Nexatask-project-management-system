import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (request, _response, next) => {
    if (schemas.body) request.body = schemas.body.parse(request.body) as unknown;
    if (schemas.params)
      request.params = schemas.params.parse(request.params) as Record<string, string>;
    if (schemas.query) request.query = schemas.query.parse(request.query) as typeof request.query;
    next();
  };
}
