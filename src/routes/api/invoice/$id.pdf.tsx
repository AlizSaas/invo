import { authMiddleware } from '@/middlewares/dependencies'
import { createFileRoute } from '@tanstack/react-router'
import { invoices } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { PDFService } from '@/services/pdf'

export const Route = createFileRoute('/api/invoice/$id/pdf')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ context, params }) => {
        const { db, user, env } = context
        const { id } = params

        const [invoice] = await db
          .select({
            invoiceNumber: invoices.invoiceNumber,
            pdfGeneratedAt: invoices.pdfGeneratedAt,
          })
          .from(invoices)
          .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
          .limit(1)

        if (!invoice || !invoice.pdfGeneratedAt) {
          return new Response(JSON.stringify({ error: 'PDF not available' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const pdfService = new PDFService(
          env.STORAGE,
          env.CLOUDFLARE_ACCOUNT_ID,
          env.CLOUDFLARE_API_TOKEN
        )

        const pdf = await pdfService.getPDF(user.id, id, invoice.invoiceNumber)

        if (!pdf) {
          return new Response(JSON.stringify({ error: 'PDF file not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(pdf.body, {
          headers: {
            'Content-Type': pdf.contentType,
            'Content-Disposition': `inline; filename="${pdf.filename}"`,
          },
        })
      },
    },
  },
})
