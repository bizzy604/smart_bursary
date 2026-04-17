/**
 * Purpose: Orchestrate tenant settings reads and writes for county admins.
 * Why important: Persists branding and form-customization controls per county.
 * Used by: TenantController and county-facing branding surfaces.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { resolveScoringWeights, scoringWeightsToRecord } from '../ai/scoring-weights.constants';
import {
	BrandingSettingsDto,
	FormCustomizationSettingsDto,
	UpdateSettingsDto,
} from './dto/update-settings.dto';

const FORM_SECTION_KEYS = [
	'section-a',
	'section-b',
	'section-c',
	'section-d',
	'section-e',
	'section-f',
] as const;

const DEFAULT_FORM_CUSTOMIZATION = {
	colorScheme: 'COUNTY_PRIMARY',
	logoPlacement: 'HEADER_CENTER',
	sectionOrder: [...FORM_SECTION_KEYS],
} as const;

type SettingsObject = Record<string, unknown>;

@Injectable()
export class TenantService {
	constructor(private readonly prisma: PrismaService) {}

	async getSettings(countyId: string) {
		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: {
				id: true,
				name: true,
				fundName: true,
				legalReference: true,
				logoS3Key: true,
				primaryColor: true,
				settings: true,
				updatedAt: true,
			},
		});

		if (!county) {
			throw new NotFoundException('County not found.');
		}

		const settings = this.asObject(county.settings);
		const formCustomization = this.resolveFormCustomization(settings, undefined);
		const scoringWeights = scoringWeightsToRecord(resolveScoringWeights(settings.scoringWeights));

		return {
			data: {
				countyId: county.id,
				branding: {
					countyName: county.name,
					fundName: county.fundName ?? `${county.name} Education Fund`,
					legalReference: county.legalReference ?? '',
					primaryColor: county.primaryColor,
					logoS3Key: county.logoS3Key ?? '',
					logoText: this.resolveLogoText(settings, county.name),
				},
				formCustomization,
				scoringWeights,
				updatedAt: county.updatedAt.toISOString(),
			},
		};
	}

	async updateSettings(countyId: string, dto: UpdateSettingsDto) {
		const county = await this.prisma.county.findUnique({
			where: { id: countyId },
			select: { id: true, name: true, settings: true },
		});

		if (!county) {
			throw new NotFoundException('County not found.');
		}

		const settings = this.asObject(county.settings);
		const nextSettings: SettingsObject = { ...settings };
		const updateData: Prisma.CountyUpdateInput = {};

		if (dto.branding) {
			this.applyBrandingUpdate(dto.branding, nextSettings, updateData);
		}

		if (dto.formCustomization) {
			nextSettings.formCustomization = this.resolveFormCustomization(
				settings,
				dto.formCustomization,
			) as unknown as Prisma.InputJsonValue;
		}

		updateData.settings = nextSettings as unknown as Prisma.InputJsonValue;
		await this.prisma.county.update({ where: { id: county.id }, data: updateData });

		return this.getSettings(county.id);
	}

	private applyBrandingUpdate(
		branding: BrandingSettingsDto,
		nextSettings: SettingsObject,
		updateData: Prisma.CountyUpdateInput,
	) {
		const countyName = this.normalizeOptionalString(branding.countyName);
		if (countyName !== undefined) {
			updateData.name = countyName;
		}

		if (branding.fundName !== undefined) {
			updateData.fundName = this.normalizeOptionalString(branding.fundName) ?? null;
		}

		if (branding.legalReference !== undefined) {
			updateData.legalReference =
				this.normalizeOptionalString(branding.legalReference) ?? null;
		}

		if (branding.primaryColor !== undefined) {
			updateData.primaryColor = branding.primaryColor;
		}

		if (branding.logoS3Key !== undefined) {
			updateData.logoS3Key = this.normalizeOptionalString(branding.logoS3Key) ?? null;
		}

		if (branding.logoText !== undefined) {
			const logoText = this.normalizeOptionalString(branding.logoText);
			if (logoText) {
				nextSettings.logoText = logoText.toUpperCase();
			} else {
				delete nextSettings.logoText;
			}
		}
	}

	private resolveFormCustomization(
		settings: SettingsObject,
		incoming: FormCustomizationSettingsDto | undefined,
	) {
		const stored = this.asObject(settings.formCustomization);
		const sectionOrder = this.normalizeSectionOrder(
			incoming?.sectionOrder ?? (stored.sectionOrder as string[] | undefined),
		);

		return {
			colorScheme:
				incoming?.colorScheme ??
				(stored.colorScheme as string | undefined) ??
				DEFAULT_FORM_CUSTOMIZATION.colorScheme,
			logoPlacement:
				incoming?.logoPlacement ??
				(stored.logoPlacement as string | undefined) ??
				DEFAULT_FORM_CUSTOMIZATION.logoPlacement,
			sectionOrder,
		};
	}

	private normalizeSectionOrder(sectionOrder: string[] | undefined): string[] {
		if (!sectionOrder) {
			return [...DEFAULT_FORM_CUSTOMIZATION.sectionOrder];
		}

		const unique = new Set(sectionOrder);
		if (unique.size !== FORM_SECTION_KEYS.length) {
			throw new BadRequestException(
				'Section order must include each known section exactly once.',
			);
		}

		for (const key of FORM_SECTION_KEYS) {
			if (!unique.has(key)) {
				throw new BadRequestException(
					'Section order must include each known section exactly once.',
				);
			}
		}

		return [...sectionOrder];
	}

	private resolveLogoText(settings: SettingsObject, countyName: string): string {
		if (typeof settings.logoText === 'string' && settings.logoText.trim()) {
			return settings.logoText.trim().toUpperCase();
		}

		const initials = countyName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
		return initials || 'CT';
	}

	private normalizeOptionalString(value: string | undefined): string | undefined {
		if (value === undefined) {
			return undefined;
		}

		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	private asObject(value: Prisma.JsonValue | unknown): SettingsObject {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return value as SettingsObject;
		}

		return {};
	}
}
