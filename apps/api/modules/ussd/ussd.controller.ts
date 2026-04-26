/**
 * Purpose: Africa's Talking USSD callback endpoint.
 * Why important: Discovery channel for low-bandwidth users (no smartphone /
 *                no data plan) per §10 of the design doc.
 * Used by: External — AT delivers form-urlencoded POSTs here.
 *
 * Response contract: text/plain body starting with "CON " or "END ".
 */
import {
	Body,
	Controller,
	Header,
	HttpCode,
	Logger,
	Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UssdCallbackDto } from './dto/ussd-callback.dto';
import { UssdService } from './ussd.service';

@ApiTags('USSD')
@Controller('ussd')
export class UssdController {
	private readonly logger = new Logger(UssdController.name);

	constructor(private readonly ussdService: UssdService) {}

	@Post('callback')
	@HttpCode(200)
	@Header('Content-Type', 'text/plain; charset=utf-8')
	@ApiOperation({
		summary:
			'Africa\'s Talking USSD callback. Returns plain text starting with CON or END.',
	})
	@ApiBody({ type: UssdCallbackDto })
	async handleCallback(@Body() dto: UssdCallbackDto): Promise<string> {
		this.logger.debug(
			`USSD callback session=${dto.sessionId} phone=${redactPhone(dto.phoneNumber)} text="${dto.text ?? ''}"`,
		);
		return this.ussdService.resolveResponse({
			sessionId: dto.sessionId,
			phoneNumber: dto.phoneNumber,
			text: dto.text ?? '',
		});
	}
}

function redactPhone(phoneNumber: string): string {
	if (!phoneNumber) return '';
	if (phoneNumber.length <= 5) return phoneNumber;
	return `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-2)}`;
}
