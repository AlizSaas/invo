import { Currency } from '@/lib/types';
import { ExternalServiceError } from '@/utils/error';
import { createLogger } from '@/utils/logger';
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private logger;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
    this.webhookSecret = webhookSecret;
    this.logger = createLogger();
  }

  /**
   * Create a Stripe Checkout session for invoice payment
   */
  async createCheckoutSession(
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    currency: Currency,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string,
    businessName?: string
  ): Promise<{ sessionId: string; url: string }> {
    try {
      // Stripe expects amount in smallest currency unit (cents for USD)
      const amountInCents = Math.round(amount * 100);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Invoice ${invoiceNumber}`,
                description: businessName ? `Payment to ${businessName}` : 'Invoice payment',
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      this.logger.info('Checkout session created', {
        sessionId: session.id,
        invoiceId,
        amount,
        currency,
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error as Error);
      throw new ExternalServiceError('Stripe', 'Failed to create payment session');
    }
  }

  /**
   * Verify and parse webhook event
   * ⚠️ IMPORTANT: Use constructEventAsync for async environments (Cloudflare Workers, Node.js)
   */
  async verifyWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    try {
      // ✅ Use constructEventAsync instead of constructEvent for async environments
      return await this.stripe.webhooks.constructEventAsync(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      this.logger.error('Webhook verification failed', error as Error);
      throw new ExternalServiceError('Stripe', 'Invalid webhook signature');
    }
  }

  /**
   * Retrieve details of a checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error('Failed to retrieve checkout session', error as Error);
      throw new ExternalServiceError('Stripe', 'Failed to retrieve payment session');
    }
  }

  /**
   * Retrieve details of a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', error as Error);
      throw new ExternalServiceError('Stripe', 'Failed to retrieve payment details');
    }
  }
}