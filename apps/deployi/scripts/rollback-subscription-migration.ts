import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";


const connectionString = process.env.DATABASE_URL!;

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function rollbackSubscriptionMigration() {
	console.log("⚠️  Starting subscription migration rollback...");
	console.log("This will remove the subscription tier columns from the database");

	try {
		// Remove the subscription columns
		await sql`ALTER TABLE "user_temp" DROP COLUMN IF EXISTS "subscriptionTier"`;
		console.log(" Removed subscriptionTier column");

		await sql`ALTER TABLE "user_temp" DROP COLUMN IF EXISTS "hasUnlimitedDeployments"`;
		console.log(" Removed hasUnlimitedDeployments column");

		await sql`ALTER TABLE "user_temp" DROP COLUMN IF EXISTS "unlimitedPlanStartDate"`;
		console.log(" Removed unlimitedPlanStartDate column");

		await sql`ALTER TABLE "user_temp" DROP COLUMN IF EXISTS "unlimitedPlanEndDate"`;
		console.log(" Removed unlimitedPlanEndDate column");

		console.log(" Subscription migration rollback completed successfully");

	} catch (error) {
		console.error(" Rollback failed:", error);
		throw error;
	} finally {
		await sql.end();
	}
}

// Uncomment the line below to actually run the rollback
// rollbackSubscriptionMigration()
// 	.then(() => {
// 		console.log("Rollback script finished");
// 		process.exit(0);
// 	})
// 	.catch((error) => {
// 		console.error("Rollback script failed:", error);
// 		process.exit(1);
// 	});
