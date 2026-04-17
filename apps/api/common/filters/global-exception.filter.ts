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
		const code = this.resolveErrorCode(exceptionResponse, isHttpException);
		const message = this.resolveErrorMessage(exceptionResponse);

		response.status(status).json({
			error: {
				code,
				message,
				timestamp: new Date().toISOString(),
				path: request.url,
			},
		});
	}

	private resolveErrorCode(exceptionResponse: unknown, isHttpException: boolean): string {
		const fallback = isHttpException ? 'HTTP_ERROR' : 'INTERNAL_ERROR';
		if (!exceptionResponse || typeof exceptionResponse !== 'object') {
			return fallback;
		}

		const responseRecord = exceptionResponse as Record<string, unknown>;
		if (typeof responseRecord.code === 'string') {
			return responseRecord.code;
		}

		const nestedMessage = responseRecord.message;
		if (
			nestedMessage &&
			typeof nestedMessage === 'object' &&
			!Array.isArray(nestedMessage) &&
			typeof (nestedMessage as Record<string, unknown>).code === 'string'
		) {
			return (nestedMessage as Record<string, string>).code;
		}

		return fallback;
	}

	private resolveErrorMessage(exceptionResponse: unknown): unknown {
		if (
			typeof exceptionResponse === 'object' &&
			exceptionResponse !== null &&
			'message' in exceptionResponse
		) {
			return (exceptionResponse as Record<string, unknown>).message;
		}

		return 'Internal server error';
	}
}
