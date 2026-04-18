/**
 * Purpose: Add per-request observability metadata and duration logs for HTTP calls.
 * Why important: Improves production troubleshooting by correlating requests and measuring latency.
 * Used by: Global interceptor chain in AppModule and integration health checks.
 */
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

type HttpRequest = {
	headers?: Record<string, string | string[] | undefined>;
	method?: string;
	originalUrl?: string;
	url?: string;
	requestId?: string;
};

type HttpResponse = {
	statusCode: number;
	setHeader: (name: string, value: string) => void;
};

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
	private readonly logger = new Logger(RequestObservabilityInterceptor.name);

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== 'http') {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest<HttpRequest>();
		const response = context.switchToHttp().getResponse<HttpResponse>();
		const startTime = process.hrtime.bigint();

		const incomingRequestId = request.headers?.['x-request-id'];
		const requestId =
			typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
				? incomingRequestId
				: randomUUID();

		request.requestId = requestId;
		response.setHeader('X-Request-Id', requestId);

		return next.handle().pipe(
			finalize(() => {
				const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
				const method = request.method ?? 'UNKNOWN';
				const path = request.originalUrl ?? request.url ?? '/';
				this.logger.log(
					`${method} ${path} status=${response.statusCode} durationMs=${durationMs.toFixed(1)} requestId=${requestId}`,
				);
			}),
		);
	}
}