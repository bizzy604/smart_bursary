/**
 * Purpose: DTO for the Africa's Talking USSD webhook payload.
 * Why important: AT delivers form-urlencoded fields; we validate with class-validator
 *                so we get rejection of malformed callbacks without touching service code.
 * Used by: UssdController.handleCallback.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UssdCallbackDto {
	@ApiProperty({ description: 'Africa\'s Talking session id (unique per dialing session).' })
	@IsString()
	@MaxLength(120)
	sessionId!: string;

	@ApiProperty({
		description: 'Caller MSISDN in international format. AT delivers it with the leading "+".',
	})
	@IsString()
	@MaxLength(20)
	phoneNumber!: string;

	@ApiProperty({ description: 'The shortcode the user dialed, e.g. *483*100#.' })
	@IsString()
	@MaxLength(40)
	serviceCode!: string;

	@ApiProperty({ description: 'Mobile network code (e.g. Safaricom = 63902).' })
	@IsString()
	@MaxLength(20)
	networkCode!: string;

	/**
	 * AT delivers the cumulative chain of keys pressed during this session,
	 * separated by `*`. e.g. user pressed "1" then "2" → text === "1*2".
	 * The first callback of a session has text === "" so we render the main menu.
	 */
	@ApiProperty({
		description: 'Cumulative *-separated key chain since session start. Empty on first callback.',
		example: '1*2',
	})
	@IsString()
	@IsOptional()
	@MaxLength(2000)
	text?: string;
}
