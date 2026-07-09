export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, 'bad_request', cause);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 404, 'not_found', cause);
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 502, 'bad_gateway', cause);
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 504, 'gateway_timeout', cause);
  }
}

export function toHttpError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('Erro interno', 500, 'internal_error', error);
}
