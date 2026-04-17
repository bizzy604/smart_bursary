/**
 * Purpose: Provide SMS provider adapter with deterministic mock behavior.
 * Why important: Keeps notification delivery transport logic isolated from workflow services.
 * Used by: SmsProcessor queue worker and notification delivery execution.
 */
import { Injectable } from '@nestjs/common';

export type SmsSendInput = {
	to: string;
	message: string;
	eventType: string;
	countyId: string;
};

export type SmsSendResult = {
	providerMessageId: string;
};

@Injectable()
export class SmsService {
	async send(input: SmsSendInput): Promise<SmsSendResult> {
		if (process.env.SMS_FORCE_FAIL === 'true') {
			throw new Error('SMS provider forced failure via SMS_FORCE_FAIL.');
		}

		if (input.to.endsWith('999999')) {
			throw new Error('SMS provider rejected recipient phone number.');
		}

		const providerMessageId = `SMS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
		return { providerMessageId };
	}
}
