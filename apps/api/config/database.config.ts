/**
 * Purpose: Map database-related environment variables into typed config.
 * Why important: Avoids direct process env usage in persistence services.
 * Used by: Prisma service and database module wiring.
 */
export default () => ({
	database: {
		url: process.env.DATABASE_URL ?? '',
		poolSize: Number.parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
	},
});
