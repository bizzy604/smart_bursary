/**
 * Purpose: Normalize unhandled errors into stable API error responses.
 * Why important: Prevents leaking internals while keeping client error contracts consistent.
 * Used by: Global Nest exception pipeline.
 */
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const isHttpException = exception instanceof HttpException;
		const status = isHttpException
			? exception.getStatus()
			: HttpStatus.INTERNAL_SERVER_ERROR;

		const exceptionResponse = isHttpException ? exception.getResponse() : null;
		const message =
			typeof exceptionResponse === 'object' &&
			exceptionResponse !== null &&
			'message' in exceptionResponse
				? exceptionResponse.message
				: 'Internal server error';

		response.status(status).json({
			error: {
				code: isHttpException ? 'HTTP_ERROR' : 'INTERNAL_ERROR',
				message,
				timestamp: new Date().toISOString(),
				path: request.url,
			},
		});
	}
}
