/**
 * Purpose: USSD menu state machine for the Smart Bursary discovery channel.
 * Why important: Stateless menu rendering keyed off the AT `text` chain. No
 *                Redis/DB session state required for the read-only flows in
 *                this scaffold; future write flows (apply, withdraw) will
 *                introduce a small session cache for OTP + idempotency.
 * Used by: UssdController.handleCallback.
 *
 * Response contract: AT expects plain text starting with either:
 *   - "CON ..."  → keep the session open, show this prompt
 *   - "END ..."  → terminate the session, show this final message
 */
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus, DisbursementStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

/** USSD screens cap at ~160 chars on basic feature phones. */
const MAX_RESPONSE_CHARS = 160;

@Injectable()
export class UssdService {
	private readonly logger = new Logger(UssdService.name);

	constructor(private readonly prisma: PrismaService) {}

	async resolveResponse(args: {
		sessionId: string;
		phoneNumber: string;
		text: string;
	}): Promise<string> {
		const { phoneNumber } = args;
		const path = (args.text ?? '').split('*').filter((segment) => segment.length > 0);

		try {
			if (path.length === 0) {
				return mainMenu();
			}
			const [first, ...rest] = path;
			switch (first) {
				case '1':
					return this.applicationStatusFlow(phoneNumber, rest);
				case '2':
					return this.allocationStatusFlow(phoneNumber);
				case '3':
					return this.disbursementStatusFlow(phoneNumber);
				case '4':
					return endResponse(
						'For help, call your county bursary office during working hours. Asante.',
					);
				default:
					return endResponse('Invalid choice. Dial again to retry.');
			}
		} catch (error) {
			this.logger.error(
				`USSD handler failed for sessionId=${args.sessionId}: ${(error as Error).message}`,
				(error as Error).stack,
			);
			return endResponse('Service temporarily unavailable. Please try again later.');
		}
	}

	private async applicationStatusFlow(phoneNumber: string, rest: string[]): Promise<string> {
		// /1 → ask for an identifier (or auto-resolve by phone if there's a profile match)
		if (rest.length === 0) {
			return continueResponse(
				'Enter 1 to look up by phone number on file, or 0 to go back.',
			);
		}
		const choice = rest[0];
		if (choice === '0') {
			return mainMenu();
		}
		if (choice !== '1') {
			return endResponse('Invalid choice.');
		}

		const apps = await this.prisma.application.findMany({
			where: { applicant: { phone: phoneNumber } },
			orderBy: { createdAt: 'desc' },
			take: 3,
			select: {
				submissionReference: true,
				status: true,
				createdAt: true,
				program: { select: { name: true } },
			},
		});

		if (apps.length === 0) {
			return endResponse('No applications found for this phone number.');
		}

		const lines = apps.map((app) =>
			`${app.submissionReference ?? '?'}: ${shortStatus(app.status)} (${shortDate(app.createdAt)})`,
		);
		return endResponse(`Your applications:\n${lines.join('\n')}`);
	}

	private async allocationStatusFlow(phoneNumber: string): Promise<string> {
		const allocated = await this.prisma.application.findFirst({
			where: {
				applicant: { phone: phoneNumber },
				status: { in: [ApplicationStatus.ALLOCATED, ApplicationStatus.APPROVED] },
			},
			orderBy: { allocatedAt: 'desc' },
			select: {
				amountAllocated: true,
				allocatedAt: true,
				program: { select: { name: true } },
			},
		});
		if (!allocated) {
			return endResponse('No allocation yet for this phone number.');
		}
		const amount = allocated.amountAllocated
			? Number(allocated.amountAllocated).toLocaleString('en-KE')
			: '0';
		return endResponse(
			`KES ${amount} allocated for ${allocated.program?.name ?? 'your program'} on ${shortDate(allocated.allocatedAt)}.`,
		);
	}

	private async disbursementStatusFlow(phoneNumber: string): Promise<string> {
		const latest = await this.prisma.disbursementRecord.findFirst({
			where: { application: { applicant: { phone: phoneNumber } } },
			orderBy: { initiatedAt: 'desc' },
			select: {
				amountKes: true,
				status: true,
				initiatedAt: true,
				confirmedAt: true,
				transactionId: true,
			},
		});
		if (!latest) {
			return endResponse('No disbursement on file for this phone number.');
		}
		const amount = Number(latest.amountKes).toLocaleString('en-KE');
		if (latest.status === DisbursementStatus.SUCCESS) {
			return endResponse(
				`KES ${amount} disbursed on ${shortDate(latest.confirmedAt ?? latest.initiatedAt)}. Ref: ${latest.transactionId ?? '?'}`,
			);
		}
		return endResponse(
			`Disbursement of KES ${amount} is ${latest.status}. Initiated ${shortDate(latest.initiatedAt)}.`,
		);
	}
}

// ─────────────────────────────────────────────────────────────────────
// Pure helpers — exported for testing.
// ─────────────────────────────────────────────────────────────────────

export function mainMenu(): string {
	return continueResponse(
		'Smart Bursary\n1. Application status\n2. Allocation amount\n3. Disbursement\n4. Help',
	);
}

export function continueResponse(message: string): string {
	return `CON ${truncate(message, MAX_RESPONSE_CHARS - 4)}`;
}

export function endResponse(message: string): string {
	return `END ${truncate(message, MAX_RESPONSE_CHARS - 4)}`;
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 1)}…`;
}

function shortStatus(status: ApplicationStatus): string {
	switch (status) {
		case ApplicationStatus.DRAFT:
			return 'Draft';
		case ApplicationStatus.SUBMITTED:
			return 'Submitted';
		case ApplicationStatus.WARD_REVIEW:
			return 'Ward Review';
		case ApplicationStatus.WARD_DISTRIBUTION_PENDING:
			return 'Distribution';
		case ApplicationStatus.VILLAGE_ALLOCATION_PENDING:
			return 'Allocation';
		case ApplicationStatus.ALLOCATED:
			return 'Allocated';
		case ApplicationStatus.COUNTY_REVIEW:
			return 'County Review';
		case ApplicationStatus.APPROVED:
			return 'Approved';
		case ApplicationStatus.REJECTED:
			return 'Rejected';
		case ApplicationStatus.WAITLISTED:
			return 'Waitlist';
		case ApplicationStatus.DISBURSED:
			return 'Disbursed';
		case ApplicationStatus.WITHDRAWN:
			return 'Withdrawn';
		default:
			return String(status);
	}
}

function shortDate(date: Date | null): string {
	if (!date) return 'n/a';
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}
