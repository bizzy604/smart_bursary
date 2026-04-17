/**
 * Purpose: Provide S3-compatible object storage operations for documents.
 * Why important: Decouples document persistence from local disk and enables production object storage.
 * Used by: DocumentService upload and signed-download flows.
 */

import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';

type UploadObjectInput = {
	key: string;
	contentType: string;
	body: Buffer;
};

type SignedDownloadUrl = {
	url: string;
	expiresAt: string;
};

@Injectable()
export class S3Service {
	private readonly logger = new Logger(S3Service.name);
	private readonly bucket: string;
	private readonly signedUrlTtlSeconds: number;
	private readonly s3Client: S3Client;

	constructor() {
		const bucket = process.env.S3_BUCKET?.trim();
		const region = process.env.S3_REGION?.trim();
		const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
		const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
		const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;

		if (!bucket || !region) {
			throw new Error('S3_BUCKET and S3_REGION must be configured for document uploads.');
		}

		if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
			throw new Error(
				'S3 credentials are incomplete. Provide both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.',
			);
		}

		this.bucket = bucket;
		this.signedUrlTtlSeconds = Number.parseInt(
			process.env.S3_SIGNED_URL_TTL_SECONDS ?? '900',
			10,
		);

		this.s3Client = new S3Client({
			region,
			endpoint,
			forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
			...(accessKeyId && secretAccessKey
				? {
						credentials: {
							accessKeyId,
							secretAccessKey,
						},
					}
				: {}),
		});

		this.logger.log(`Document storage configured for S3 bucket ${this.bucket}`);
	}

	async uploadObject(input: UploadObjectInput): Promise<void> {
		await this.s3Client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: input.key,
				Body: input.body,
				ContentType: input.contentType,
			}),
		);
	}

	async getSignedDownloadUrl(key: string): Promise<SignedDownloadUrl> {
		const expiresAt = new Date(Date.now() + this.signedUrlTtlSeconds * 1000).toISOString();
		const url = await getSignedUrl(
			this.s3Client,
			new GetObjectCommand({ Bucket: this.bucket, Key: key }),
			{ expiresIn: this.signedUrlTtlSeconds },
		);

		return { url, expiresAt };
	}
}
