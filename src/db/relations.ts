import { relations } from "drizzle-orm";
import { 
  clients, 
  invoices, 
  invoiceItems, 
  invoiceEvents, 
  payments, 
  settings, 
  user
} from "./schema"; // Your Postgres schema file


export const usersRelations = relations(user, ({ one, many }) => ({
  clients: many(clients),
  invoices: many(invoices),
  settings: one(settings),
})); // a user can have many clients and invoices, but only one settings record

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(user, {
    fields: [clients.userId],
    references: [user.id],
  }),
  invoices: many(invoices),
})); // clients can have many invoices, but belong to one user

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, {
    fields: [invoices.userId],
    references: [user.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  events: many(invoiceEvents),
  payments: many(payments),
})); // invoices belong to one user and one client, but can have many items, events, and payments

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
})); // invoice items belong to one invoice

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));