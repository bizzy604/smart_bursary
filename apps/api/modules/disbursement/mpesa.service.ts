/**
 * Purpose: Build M-Pesa B2C payloads and normalize payment references for disbursement execution.
 * Why important: Keeps payment-provider-specific shaping out of controllers and orchestration code.
 * Used by: DisbursementService and future disbursement processors.
 */
import axios from 'axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MpesaDisburseDto } from './dto/mpesa-disburse.dto';

@Injectable()
export class MpesaService {
	formatPhoneNumber(phoneNumber: string): string {
		const compact = phoneNumber.replace(/\s+/g, '');
		if (compact.startsWith('+254')) {
			return compact.slice(1);
		}

		if (compact.startsWith('0')) {
			return `254${compact.slice(1)}`;
		}

		if (compact.startsWith('254')) {
			return compact;
		}

		throw new BadRequestException('Phone number must be a Kenyan mobile number.');
	}

	buildReference(applicationId: string, disbursementId: string): string {
		return `DIS-${applicationId.slice(0, 8)}-${disbursementId.slice(0, 8)}`;
	}

	buildB2CPayload(dto: MpesaDisburseDto) {
		return {
			applicationId: dto.applicationId,
			disbursementId: dto.disbursementId,
			phoneNumber: this.formatPhoneNumber(dto.phoneNumber),
			amountKes: dto.amountKes,
			reference: dto.reference,
		};
	}

	async executeB2C(
		dto: MpesaDisburseDto,
	): Promise<{ transactionId: string; rawResponse: unknown }> {
		const payload = this.buildB2CPayload(dto);
		const mode = (process.env.MPESA_B2C_MODE ?? '').trim().toLowerCase();
		if (mode === 'mock' || !process.env.MPESA_B2C_URL) {
			return this.executeMockB2C(payload);
		}

		const response = await axios.post(process.env.MPESA_B2C_URL, payload, {
			headers: {
				'Content-Type': 'application/json',
				...(process.env.MPESA_B2C_BEARER_TOKEN
					? { Authorization: `Bearer ${process.env.MPESA_B2C_BEARER_TOKEN}` }
					: {}),
			},
			timeout: this.resolveTimeoutMs(),
		});

		const transactionId =
			this.resolveTransactionId(response.data) ??
			`MPESA-${Date.now()}-${dto.disbursementId.slice(0, 6)}`;
		return { transactionId, rawResponse: response.data };
	}

	private executeMockB2C(payload: ReturnType<MpesaService['buildB2CPayload']>) {
		if (payload.phoneNumber.endsWith('999999')) {
			throw new Error('Simulated M-Pesa provider failure.');
		}

		return {
			transactionId: `MOCK-MPESA-${Date.now()}-${payload.disbursementId.slice(0, 6)}`,
			rawResponse: {
				provider: 'mock-mpesa',
				resultCode: 0,
				reference: payload.reference,
			},
		};
	}

	private resolveTransactionId(payload: unknown): string | undefined {
		if (!payload || typeof payload !== 'object') {
			return undefined;
		}

		const record = payload as Record<string, unknown>;
		const transactionId = record.transactionId ?? record.ConversationID ?? record.OriginatorConversationID;
		return typeof transactionId === 'string' && transactionId.trim()
			? transactionId.trim()
			: undefined;
	}

	private resolveTimeoutMs(): number {
		const timeoutRaw = process.env.MPESA_B2C_TIMEOUT_MS ?? '7000';
		const timeout = Number.parseInt(timeoutRaw, 10);
		return Number.isFinite(timeout) && timeout > 0 ? timeout : 7000;
	}
}
