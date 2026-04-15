/**
 * Purpose: Translate Prisma query errors into HTTP-friendly responses.
 * Why important: Makes data-layer failures actionable and predictable for API consumers.
 * Used by: Global filter chain during controller request handling.
 */
import {
	ArgumentsHost,
	Catch,
	ConflictException,
	ExceptionFilter,
	NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
	catch(
		exception: PrismaClientKnownRequestError,
		host: ArgumentsHost,
	): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		if (exception.code === 'P2002') {
			throw new ConflictException({
				message: 'A record with these details already exists.',
			});
		}

		if (exception.code === 'P2025') {
			throw new NotFoundException({
				message: 'Requested record was not found.',
			});
		}

		response.status(500).json({
			error: {
				code: 'DATABASE_ERROR',
				message: 'Database request failed.',
				timestamp: new Date().toISOString(),
			},
		});
	}
}
