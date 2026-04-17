/**
 * Purpose: Provide S3-compatible object storage operations for documents.
 * Why important: Decouples document persistence from local disk and enables production object storage.
 * Used by: DocumentService upload and signed-download flows.
 */

import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
	private readonly bucket = process.env.S3_BUCKET ?? '';
	private readonly signedUrlTtlSeconds = Number.parseInt(
		process.env.S3_SIGNED_URL_TTL_SECONDS ?? '900',
		10,
	);
	private readonly localRoot = path.join(process.cwd(), 'uploads', 'documents');
	private readonly s3Client: S3Client | null;

	constructor() {
		const region = process.env.S3_REGION;
		const accessKeyId = process.env.S3_ACCESS_KEY_ID;
		const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
		const endpoint = process.env.S3_ENDPOINT;

		if (this.bucket && region && accessKeyId && secretAccessKey) {
			this.s3Client = new S3Client({
				region,
				endpoint: endpoint || undefined,
				forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
				credentials: {
					accessKeyId,
					secretAccessKey,
				},
			});
			this.logger.log(`Document storage configured for S3 bucket ${this.bucket}`);
			return;
		}

		this.s3Client = null;
		fs.mkdirSync(this.localRoot, { recursive: true });
		this.logger.log('Document storage configured for local filesystem fallback');
	}

	async uploadObject(input: UploadObjectInput): Promise<void> {
		if (this.s3Client) {
			await this.s3Client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: input.key,
					Body: input.body,
					ContentType: input.contentType,
				}),
			);
			return;
		}

		const localPath = path.join(this.localRoot, input.key);
		fs.mkdirSync(path.dirname(localPath), { recursive: true });
		fs.writeFileSync(localPath, input.body);
	}

	async getSignedDownloadUrl(key: string): Promise<SignedDownloadUrl> {
		const expiresAt = new Date(Date.now() + this.signedUrlTtlSeconds * 1000).toISOString();

		if (this.s3Client) {
			const url = await getSignedUrl(
				this.s3Client,
				new GetObjectCommand({ Bucket: this.bucket, Key: key }),
				{ expiresIn: this.signedUrlTtlSeconds },
			);
			return { url, expiresAt };
		}

		return {
			url: `local-storage://${key.replaceAll('\\', '/')}`,
			expiresAt,
		};
	}
}
