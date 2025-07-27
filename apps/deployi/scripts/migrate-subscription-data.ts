import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../server/db/schema";


const connectionString = process.env.DATABASE_URL!;

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql, { schema });

async function migrateSubscriptionData() {
	console.log("Starting subscription data migration...");

	try {
		// Get all users with existing Stripe subscriptions
		const usersWithSubscriptions = await db.query.users_temp.findMany({
			where: (users, { and, isNotNull, gt }) => 
				and(
					isNotNull(users.stripeCustomerId),
					gt(users.serversQuantity, 0)
				)
		});

		console.log(`Found ${usersWithSubscriptions.length} users with existing subscriptions`);

		// Update users with existing server-based subscriptions to "legacy" tier
		for (const user of usersWithSubscriptions) {
			await db
				.update(schema.users_temp)
				.set({
					subscriptionTier: "legacy",
					// Keep hasUnlimitedDeployments as false for legacy users
					// They continue with their server-based limits
				})
				.where(eq(schema.users_temp.id, user.id));

			console.log(`Updated user ${user.id} to legacy subscription tier`);
		}

		// Get all free users (no Stripe subscription)
		const freeUsers = await db.query.users_temp.findMany({
			where: (users, { and, isNull, eq: eqOp }) => 
				and(
					isNull(users.stripeCustomerId),
					eqOp(users.serversQuantity, 0)
				)
		});

		console.log(`Found ${freeUsers.length} free users`);

		// Ensure free users have correct subscription tier
		for (const user of freeUsers) {
			await db
				.update(schema.users_temp)
				.set({
					subscriptionTier: "free",
					hasUnlimitedDeployments: false,
				})
				.where(eq(schema.users_temp.id, user.id));
		}

		console.log("Subscription data migration completed successfully");

	} catch (error) {
		console.error(" Migration failed:", error);
		throw error;
	} finally {
		await sql.end();
	}
}

 
migrateSubscriptionData()
	.then(() => {
		console.log("Migration script finished");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Migration script failed:", error);
		process.exit(1);
	});
