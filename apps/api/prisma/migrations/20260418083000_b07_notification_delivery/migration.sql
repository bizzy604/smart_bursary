-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "recipient_phone" VARCHAR(20),
    "message_text" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "queue_job_id" VARCHAR(120),
    "provider_message_id" VARCHAR(120),
    "failure_reason" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notification_county_queued" ON "notification_deliveries"("county_id", "queued_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_application" ON "notification_deliveries"("application_id", "queued_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_status" ON "notification_deliveries"("status", "queued_at" DESC);

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
