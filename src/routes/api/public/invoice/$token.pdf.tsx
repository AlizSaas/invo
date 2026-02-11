import { publicMiddleware } from '@/middlewares/dependencies'
import { createFileRoute } from '@tanstack/react-router'
import { invoicePublicTokens, invoices } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PDFService } from '@/services/pdf'


export const Route = createFileRoute('/api/public/invoice/$token/pdf')({
  server: {
    middleware: [publicMiddleware],
    handlers: {
      GET: async ({ context, params }) => {
        const { db, env } = context
        const { token } = params

        // Find invoice by public token
        const tokenRecord = await db
          .select()
          .from(invoicePublicTokens)
          .where(eq(invoicePublicTokens.token, token))
          .limit(1)
          .then(r => r[0])

        if (!tokenRecord) {
          return new Response(JSON.stringify({ error: 'Invoice not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Get invoice details
        const invoice = await db
          .select({
            userId: invoices.userId,
            invoiceNumber: invoices.invoiceNumber,
            pdfGeneratedAt: invoices.pdfGeneratedAt,
          })
          .from(invoices)
          .where(eq(invoices.id, tokenRecord.invoiceId))
          .limit(1)
          .then(r => r[0])

        if (!invoice || !invoice.pdfGeneratedAt) {
          return new Response(JSON.stringify({ error: 'PDF not available' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Initialize PDF service
        const pdfService = new PDFService(
          env.STORAGE,
          env.CLOUDFLARE_ACCOUNT_ID,
          env.CLOUDFLARE_API_TOKEN
        )

        // Get PDF from storage
        const pdf = await pdfService.getPDF(
          invoice.userId,
          tokenRecord.invoiceId,
          invoice.invoiceNumber
        )

        if (!pdf) {
          return new Response(JSON.stringify({ error: 'PDF file not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Return PDF with proper headers
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