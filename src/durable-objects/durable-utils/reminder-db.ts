
import { eq, and, like } from 'drizzle-orm';

import { Database } from '@/db';
import { clients, invoiceEvents, invoicePublicTokens, invoices, settings } from '@/db/schema';



export async function checkReminderSent(
  db: Database,
  invoiceId: string,
  idempotencyKey: string
): Promise<boolean> {
  
  try {
    const result = await db
      .select({ id: invoiceEvents.id })
      .from(invoiceEvents)
      .where(
        and(
          eq(invoiceEvents.invoiceId, invoiceId),
          eq(invoiceEvents.eventType, 'reminder_sent'),
          like(invoiceEvents.metadata, `%${idempotencyKey}%`)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking reminder sent:', error);
    return false;
  }
}

/**
 * Get invoice details with client information for sending reminder
 */
export async function getInvoiceWithClient(db: Database, invoiceId: string) {

  try {
    const result = await db
      .select({
        // Invoice fields
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        userId: invoices.userId,
        // Client fields
        clientEmail: clients.email,
        clientName: clients.name,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error getting invoice with client:', error);
    return null;
  }
}

/**
 * Get user settings for email customization
 */
export async function getUserSettings(db: Database, userId: string) {

  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return null;
  }
}

/**
 * Get public token for invoice
 */
export async function getInvoicePublicToken(db: Database, invoiceId: string) {

  try {
    const result = await db
      .select({ token: invoicePublicTokens.token })
      .from(invoicePublicTokens)
      .where(eq(invoicePublicTokens.invoiceId, invoiceId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error getting invoice public token:', error);
    return null;
  }
}

/**
 * Record that a reminder was sent
 */
export async function recordReminderSent(
  db: Database,
  invoiceId: string,
  reminderType: string,
  idempotencyKey: string
): Promise<void> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  try {
    await db.insert(invoiceEvents).values({
      id,
      invoiceId,
      eventType: 'reminder_sent',
      metadata: JSON.stringify({ 
        reminder_type: reminderType, 
        idempotency_key: idempotencyKey 
      }),
      createdAt: new Date(now),
    });
  } catch (error) {
    console.error('Error recording reminder sent:', error);
    throw error;
  }
}

/**
 * Combined function to get all data needed to send a reminder
 */
export async function getReminderData(db: Database, invoiceId: string) {
  const [invoice, publicToken] = await Promise.all([
    getInvoiceWithClient(db, invoiceId),
    getInvoicePublicToken(db, invoiceId),
  ]);

  if (!invoice || !publicToken) {
    return null;
  }

  const userSettings = await getUserSettings(db, invoice.userId);

  return {
    invoice,
    publicToken: publicToken.token,
    settings: userSettings,
  };
}