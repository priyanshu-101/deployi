ALTER TABLE "user_temp" ADD COLUMN "subscriptionTier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_temp" ADD COLUMN "hasUnlimitedDeployments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_temp" ADD COLUMN "unlimitedPlanStartDate" timestamp;--> statement-breakpoint
ALTER TABLE "user_temp" ADD COLUMN "unlimitedPlanEndDate" timestamp;