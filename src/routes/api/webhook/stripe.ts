import { createFileRoute } from '@tanstack/react-router'
 // Using your generateId util
import { eq } from 'drizzle-orm'
import { 
  payments, 
  invoices, 
  invoiceEvents, 
  clients, 
  settings 
} from "@/db/schema"
import type Stripe from 'stripe'
import { createLogger } from '@/utils/logger'
import { StripeService } from '@/services/stripe'
import { generateId } from '@/data/invoices/invoices'
import { AnalyticsService } from '@/utils/analytics'
import { publicMiddleware } from '@/middlewares/dependencies'
import { Emailservice } from '@/services/email'

export const Route = createFileRoute('/api/webhook/stripe')({
  server: {
    middleware: [publicMiddleware], // No auth middleware for webhooks
    handlers: {
        
      POST: async ({ request, context }) => {
        // 1. Get Cloudflare Ray ID for logging
        const requestId = request.headers.get('cf-ray') || crypto.randomUUID()
        const logger = createLogger(requestId)

        // 2. Setup Context (Drizzle db and Cloudflare env)
        // Note: Ensure your middleware or context setup provides 'db' 
        // linked to your Cloudflare D1 instance.
        const { db,env } = context
      

        const signature = request.headers.get('stripe-signature')
        if (!signature) {
          logger.warn('Missing Stripe signature')
          return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 })
        }

        const payload = await request.text()





        const stripeService = new StripeService(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)

        let event: Stripe.Event
        try {
          event = await stripeService.verifyWebhook(payload, signature)
        } catch (error) {
          logger.error('Webhook verification failed', error as Error)
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
        }

        logger.info('Received Stripe webhook', { type: event.type, id: event.id })
        const now = new Date()

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session
            const invoiceId = session.metadata?.invoice_id

            if (!invoiceId) {
              logger.warn('No invoice_id in session metadata')
              break
            }

            // A. Update payment record using Drizzle
            await db.update(payments)
              .set({ 
                stripePaymentIntentId: session.payment_intent as string, 
                status: 'succeeded', 
                paidAt: now 
              })
              .where(eq(payments.stripeCheckoutSessionId, session.id))

            // B. Get Invoice details
            const invoice = await db.query.invoices.findFirst({
              where: eq(invoices.id, invoiceId)
            })

            if (!invoice) {
              logger.warn('Invoice not found', { invoiceId })
              break
            }

            // C. Update invoice status & Log event (parallel)
            await Promise.all([
              db.update(invoices)
                .set({ status: 'paid', updatedAt: now })
                .where(eq(invoices.id, invoiceId)),
                
              db.insert(invoiceEvents).values({
                id: generateId(),
                invoiceId: invoiceId,
                eventType: 'paid',
                metadata: JSON.stringify({
                  payment_intent: session.payment_intent,
                  amount: session.amount_total,
                }),
                createdAt: now
              })
            ])

            // D. Call Durable Object for reminders
            const reminderDOId = env.REMINDER_SCHEDULER.idFromName(invoice.userId)
            const reminderDO = env.REMINDER_SCHEDULER.get(reminderDOId)
            await reminderDO.fetch('http://internal/cancel', {
              method: 'POST',
              body: JSON.stringify({ invoice_id: invoiceId }),
            })

            // E. Analytics & Email
            const analytics = new AnalyticsService()
            analytics.trackInvoicePaid(invoice.userId, invoiceId, Number(invoice.total), invoice.currency)

            // Fetch Client and Settings for receipt
            const [client, bizSettings] = await Promise.all([
              db.query.clients.findFirst({ where: eq(clients.id, invoice.clientId) }),
              db.query.settings.findFirst({ where: eq(settings.userId, invoice.userId) })
            ])

            if (client?.email) {
              const emailService = new Emailservice(env.RESEND_API_KEY, env.EMAIL_FROM)
              await emailService.sendPaymentReceipt(
                client.email,
                invoice.invoiceNumber,
                bizSettings?.businessName || 'invo',
                invoice.total,
                invoice.currency as any,
                now.toISOString(),
                bizSettings?.emailFromName
              )
            }

            logger.info('Invoice marked as paid', { invoiceId })
            break
          }

          case 'checkout.session.expired': {
            const session = event.data.object as Stripe.Checkout.Session
            await db.update(payments)
              .set({ status: 'failed' })
              .where(eq(payments.stripeCheckoutSessionId, session.id))
            break
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            
            // Update payment and get invoiceId back
            const updatedPayment = await db.update(payments)
              .set({ status: 'failed' })
              .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
              .returning({ invoiceId: payments.invoiceId })

            if (updatedPayment.length > 0) {
              await db.insert(invoiceEvents).values({
                id: generateId(),
                invoiceId: updatedPayment[0].invoiceId,
                eventType: 'payment_failed',
                metadata: JSON.stringify({
                  payment_intent: paymentIntent.id,
                  error: paymentIntent.last_payment_error?.message,
                }),
                createdAt: now
              })
            }
            break
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      },
    },
  },
})