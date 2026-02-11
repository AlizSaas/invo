import { clients, invoiceEvents, invoiceItems, invoicePublicTokens, invoices, settings } from "@/db/schema";
import { authMiddleware, publicMiddleware } from "@/middlewares/dependencies";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import z from "zod";
import { generateId } from "../invoices/invoices";

// In your middlewares/dependencies.ts file, add:



// Then update your public invoice functions:

export const getPublicInvoiceFn = createServerFn({ method: "GET" })
  .middleware([publicMiddleware]) // Changed from authMiddleware
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ context, data }) => {
    const { db } = context;

    // 1) Find token
    const tokenRecord = await db
      .select()
      .from(invoicePublicTokens)
      .where(eq(invoicePublicTokens.token, data.token))
      .limit(1)
      .then(r => r[0]);

    if (!tokenRecord) throw notFound();

    // 2) Invoice
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, tokenRecord.invoiceId))
      .limit(1)
      .then(r => r[0]);

    if (!invoice) throw notFound();

    // 3) Related data (parallel)
    const [client, setting, items] = await Promise.all([
      db.select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1)
        .then(r => r[0]),

      db.select()
        .from(settings)
        .where(eq(settings.userId, invoice.userId))
        .limit(1)
        .then(r => r[0]),

      db.select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id))
        .orderBy(invoiceItems.sortOrder),
    ]);

    // mark viewed
    if (invoice.status === "sent") {
      await db.update(invoices)
        .set({ status: "viewed" })
        .where(eq(invoices.id, invoice.id));

      await db.insert(invoiceEvents).values({
        id: generateId(),
        invoiceId: invoice.id,
        eventType: "viewed",
        createdAt: new Date(),
      });
    }

    const canPay = ["sent", "viewed", "overdue"].includes(invoice.status);

    return {
      invoice,
      client,
      business: setting,
      items,
      canPay,
    };
  });



export const createPublicCheckoutFn = createServerFn({ method: "POST" })
  .middleware([publicMiddleware])
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ context, data }) => {
    const { db } = context;

    const tokenRecord = await db
      .select()
      .from(invoicePublicTokens)
      .where(eq(invoicePublicTokens.token, data.token))
      .limit(1)
      .then(r => r[0]);

    if (!tokenRecord) throw notFound();

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, tokenRecord.invoiceId))
      .limit(1)
      .then(r => r[0]);

    if (!invoice) throw notFound();

    if (!["sent", "viewed", "overdue"].includes(invoice.status)) {
      throw new Error("Invoice not payable");
    }

    // TODO: call stripe service here
    // For now, return a fake checkout URL for testing
    const fakeCheckoutUrl = `/invoice/${data.token}?payment=success`;

    return {
      checkout_url: fakeCheckoutUrl,
    };
  });

