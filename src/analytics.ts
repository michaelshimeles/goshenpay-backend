// import Stripe from 'stripe';
// import { Hono } from "hono";
// import { getStripe } from '../utils/exports';

// export type Env = {
//   DATABASE_URL: string;
//   STRIPE_SECRET_KEY: string;
//   STRIPE_PUBLIC_KEY: string;
//   FRONTEND_URL: string;
//   STRIPE_WEBHOOK_SECRET: string;
//   STRIPE_CONNECT_CLIENT_ID: string;
//   SERVER_URL: string;
// };

// export const app = new Hono<{ Bindings: Env }>();


// const getDateRange = (timeRange: string) => {
//   const now = new Date();
//   switch (timeRange) {
//     case "day":
//       return { gte: Math.floor((now.getTime() - 86400000) / 1000) };
//     case "week":
//       return { gte: Math.floor((now.getTime() - 7 * 86400000) / 1000) };
//     case "month":
//       return { gte: Math.floor((now.getTime() - 30 * 86400000) / 1000) };
//     case "year":
//       return { gte: Math.floor((now.getTime() - 365 * 86400000) / 1000) };
//     default:
//       throw new Error("Invalid time range");
//   }
// };

// app.get("/dashboard", async (c) => {
//   const churchId = c.req.query("churchId");
//   const timeRange = c.req.query("timeRange"); // e.g., "week", "month", "year"

//   if (!churchId || !timeRange) {
//     return c.json({ error: "Missing required parameters" }, 400);
//   }

//   try {
//     const stripe = getStripe(c.env);
//     const [
//       totalDonations,
//       uniqueDonors,
//       averageDonation,
//       donationBreakdown,
//       growthRate,
//       topMethods
//     ] = await Promise.all([
//       calculateTotalDonations(stripe, churchId, timeRange),
//       countUniqueDonors(stripe, churchId, timeRange),
//       calculateAverageDonation(stripe, churchId, timeRange),
//       getDonationBreakdown(stripe, churchId, timeRange),
//       calculateDonationGrowthRate(stripe, churchId, timeRange),
//       getTopDonationMethods(stripe, churchId, timeRange)
//     ]);

//     return c.json({
//       totalDonations,
//       uniqueDonors,
//       averageDonation,
//       recurring: donationBreakdown.recurring,
//       oneTime: donationBreakdown.oneTime,
//       growthRate,
//       topMethods
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error);
//     return c.json({ error: "Internal server error" }, 500);
//   }
// });

// async function calculateTotalDonations(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const charges = await stripe.charges.list({
//     created: dateRange,
//     destination: churchId,
//     limit: 100,
//     expand: ['data.balance_transaction']
//   });

//   return charges.data.reduce((total, charge) => {
//     if (charge.balance_transaction && typeof charge.balance_transaction !== 'string') {
//       return total + charge.balance_transaction.net;
//     }
//     return total;
//   }, 0);
// }

// async function countUniqueDonors(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const charges = await stripe.charges.list({
//     created: dateRange,
//     destination: churchId,
//     limit: 100
//   });

//   const uniqueCustomers = new Set(charges.data.map(charge => charge.customer));
//   return uniqueCustomers.size;
// }

// async function calculateAverageDonation(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const charges = await stripe.charges.list({
//     created: dateRange,
//     destination: churchId,
//     limit: 100,
//     expand: ['data.balance_transaction']
//   });

//   const totalAmount = charges.data.reduce((total, charge) => {
//     if (charge.balance_transaction && typeof charge.balance_transaction !== 'string') {
//       return total + charge.balance_transaction.net;
//     }
//     return total;
//   }, 0);

//   return charges.data.length > 0 ? totalAmount / charges.data.length : 0;
// }

// async function getDonationBreakdown(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const charges = await stripe.charges.list({
//     created: dateRange,
//     destination: churchId,
//     limit: 100,
//     expand: ['data.invoice']
//   });

//   let recurring = 0;
//   let oneTime = 0;

//   charges.data.forEach(charge => {
//     if (charge.invoice && typeof charge.invoice !== 'string') {
//       recurring += charge.amount;
//     } else {
//       oneTime += charge.amount;
//     }
//   });

//   return { recurring, oneTime };
// }

// async function calculateDonationGrowthRate(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const endDate = Math.floor(Date.now() / 1000);
//   const startDate = dateRange.gte;
//   const previousStartDate = startDate - (endDate - startDate);

//   const [currentPeriod, previousPeriod] = await Promise.all([
//     stripe.charges.list({
//       created: { gte: startDate, lte: endDate },
//       destination: churchId,
//       limit: 100
//     }),
//     stripe.charges.list({
//       created: { gte: previousStartDate, lt: startDate },
//       destination: churchId,
//       limit: 100
//     })
//   ]);

//   const currentTotal = currentPeriod.data.reduce((total, charge) => total + charge.amount, 0);
//   const previousTotal = previousPeriod.data.reduce((total, charge) => total + charge.amount, 0);

//   if (previousTotal === 0) return 100; // Assuming 100% growth if there were no donations in the previous period
//   return ((currentTotal - previousTotal) / previousTotal) * 100;
// }

// async function getTopDonationMethods(stripe: Stripe, churchId: string, timeRange: string) {
//   const dateRange = getDateRange(timeRange);
//   const charges = await stripe.charges.list({
//     created: dateRange,
//     destination: churchId,
//     limit: 100
//   });

//   const methodTotals = charges.data.reduce((acc, charge) => {
//     const method = charge.payment_method_details?.type || 'unknown';
//     acc[method] = (acc[method] || 0) + charge.amount;
//     return acc;
//   }, {} as Record<string, number>);

//   return Object.entries(methodTotals)
//     .sort(([, a], [, b]) => b - a)
//     .slice(0, 5)
//     .map(([method, total]) => ({ method, total }));
// }

// export default app;