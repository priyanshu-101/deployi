import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../server/db/schema";

/**
 * Verification script to check that the subscription migration was successful
 */

const connectionString = process.env.DATABASE_URL!;

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql, { schema });

async function verifyMigration() {
	console.log("🔍 Verifying subscription migration...");

	try {
		// Check all users and their subscription status
		const allUsers = await db.query.users_temp.findMany({
			columns: {
				id: true,
				email: true,
				subscriptionTier: true,
				hasUnlimitedDeployments: true,
				serversQuantity: true,
				stripeCustomerId: true,
				unlimitedPlanStartDate: true,
				unlimitedPlanEndDate: true,
			}
		});

		console.log(`📊 Total users found: ${allUsers.length}`);
		console.log("\n📋 User subscription summary:");
		console.log("=" .repeat(80));

		const summary = {
			free: 0,
			legacy: 0,
			unlimited: 0,
			total: allUsers.length
		};

		for (const user of allUsers) {
			console.log(`👤 User: ${user.email || user.id}`);
			console.log(`   Subscription Tier: ${user.subscriptionTier}`);
			console.log(`   Unlimited Deployments: ${user.hasUnlimitedDeployments}`);
			console.log(`   Server Quantity: ${user.serversQuantity}`);
			console.log(`   Stripe Customer: ${user.stripeCustomerId ? "Yes" : "No"}`);
			
			if (user.unlimitedPlanStartDate) {
				console.log(`   Plan Start: ${user.unlimitedPlanStartDate}`);
			}
			if (user.unlimitedPlanEndDate) {
				console.log(`   Plan End: ${user.unlimitedPlanEndDate}`);
			}
			
			console.log("   " + "-".repeat(50));

			// Update summary
			summary[user.subscriptionTier as keyof typeof summary]++;
		}

		console.log("\n📊 Migration Summary:");
		console.log("=" .repeat(40));
		console.log(`Free users: ${summary.free}`);
		console.log(`Legacy users: ${summary.legacy}`);
		console.log(`Unlimited users: ${summary.unlimited}`);
		console.log(`Total users: ${summary.total}`);

		// Verify data integrity
		console.log("\n Data Integrity Checks:");
		console.log("=" .repeat(40));
		
		let issuesFound = 0;

		for (const user of allUsers) {
			// Check: Free users should not have unlimited deployments
			if (user.subscriptionTier === "free" && user.hasUnlimitedDeployments) {
				console.log(` Issue: Free user ${user.id} has unlimited deployments enabled`);
				issuesFound++;
			}

			// Check: Legacy users with subscriptions should have server quantity > 0
			if (user.subscriptionTier === "legacy" && user.stripeCustomerId && user.serversQuantity === 0) {
				console.log(` Warning: Legacy user ${user.id} has Stripe subscription but 0 servers`);
			}

			// Check: Unlimited users should have unlimited deployments enabled
			if (user.subscriptionTier === "unlimited" && !user.hasUnlimitedDeployments) {
				console.log(` Issue: Unlimited user ${user.id} does not have unlimited deployments enabled`);
				issuesFound++;
			}
		}

		if (issuesFound === 0) {
			console.log(" All data integrity checks passed!");
		} else {
			console.log(` Found ${issuesFound} data integrity issues`);
		}

		console.log("\n Migration verification completed!");

	} catch (error) {
		console.error(" Verification failed:", error);
		throw error;
	} finally {
		await sql.end();
	}
}

// Run the verification
verifyMigration()
	.then(() => {
		console.log("Verification script finished");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Verification script failed:", error);
		process.exit(1);
	});
