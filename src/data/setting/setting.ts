import { authMiddleware } from "@/middlewares/dependencies";
import { createServerFn } from "@tanstack/react-start";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
 export const getSettingsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;

        let userSettings = await db
            .select()
            .from(settings)
            .where(eq(settings.userId, user.id))
            .then((rows) => rows[0]);

        if (!userSettings) {
            const now = new Date();
            await db.insert(settings).values({
                id: crypto.randomUUID(),
                userId: user.id,
                defaultCurrency: "USD",
                defaultPaymentTerms: "net_30",
                timezone: "Europe/Amsterdam",
                invoicePrefix: "INV",
                nextInvoiceNumber: 1,
                createdAt: now,
                updatedAt: now,
            });
            

            userSettings = await db
                .select()
                .from(settings)
                .where(eq(settings.userId, user.id))
                .then((rows) => rows[0]);
        }

 if (!userSettings.defaultCurrency) {
            await db.update(settings).set({ defaultCurrency: 'USD' }).where(eq(settings.userId, user.id));
            userSettings.defaultCurrency = 'USD';
        }
        if (!userSettings.defaultPaymentTerms) {
            await db.update(settings).set({ defaultPaymentTerms: 'net_30' }).where(eq(settings.userId, user.id));
            userSettings.defaultPaymentTerms = 'net_30';
        }

        return userSettings;
    });

 export const updateSettingsSchema = z.object({
    businessName: z.string().nullable().optional(),
    businessEmail: z.string().email().nullable().optional(),
    businessAddress: z.string().nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    defaultCurrency: z.string().optional(),
    defaultPaymentTerms: z.string().optional(),
    timezone: z.string().optional(),
    emailFromName: z.string().nullable().optional(),
    invoicePrefix: z.string().optional(),
    nextInvoiceNumber: z.number().int().positive().optional(),
});

export const updateSettingFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator(updateSettingsSchema)
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const now = new Date();

        // Strip out empty strings so they don't overwrite valid values
        const cleanedData = Object.fromEntries(
          Object.entries(data).filter(([_, value]) => value !== '')
        );

        await db
            .update(settings)
            .set({
                ...cleanedData,
                updatedAt: now,
            })
            .where(eq(settings.userId, user.id));

        return db
            .select()
            .from(settings)
            .where(eq(settings.userId, user.id))
            .then((rows) => rows[0]);
    });


    export const getLogoUrl = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const {  user } = context;   
         const extensions = ['png', 'jpg', 'svg'];
  let logo = null;
  let contentType = '';

       for(const ext of extensions) {
        const key = `${user.id}/branding/logo.${ext}` //
        logo =  await context.env.STORAGE.get(key);

        if(logo) {
        contentType = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
      break;
        }
       }

       if(!logo) {
        throw notFound()
       }

     return new Response(logo.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
    })
