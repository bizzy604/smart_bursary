/**
 * Purpose: Build M-Pesa B2C payloads and normalize payment references for disbursement execution.
 * Why important: Keeps payment-provider-specific shaping out of controllers and orchestration code.
 * Used by: DisbursementService and future disbursement processors.
 */
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
}
