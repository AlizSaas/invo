import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Download,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createPublicCheckoutFn,
  getPublicInvoiceFn,

} from '@/data/public/public-invoice'
import { toast } from 'sonner'

export const Route = createFileRoute('/invoice/$token')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    payment: (search.payment as string) || undefined,
  }),
})

function RouteComponent() {
  // ✅ Correct hooks for TanStack file routes
  const { token } = Route.useParams()
  const search = Route.useSearch()

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: () => getPublicInvoiceFn({ data: { token } }),
    enabled: !!token,
  })



  const payMutation = useMutation({
    mutationFn: async () => await createPublicCheckoutFn({ data: { token } }),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.message || 'Failed to create checkout session. Please try again.'
      )
    },
  })

  const paymentSuccess = search?.payment === 'success'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              This invoice link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { invoice, client, business, items, canPay } = data
  
 const pdfUrl = invoice.pdfGeneratedAt ? `/api/public/invoice/${token}/pdf` : null


return (
  <div className="min-h-screen bg-background py-12 px-4">
    <div className="max-w-3xl mx-auto space-y-6">
      {paymentSuccess && (
        <div className="p-4 border rounded-xl flex items-center gap-3 bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-sm text-muted-foreground">
              Thank you for your payment.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="border-b space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {business?.businessName || "Invoice"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Invoice #{invoice.invoiceNumber}
              </p>
            </div>

            <Badge
              variant="outline"
              className="capitalize text-sm px-3 py-1"
            >
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Business + Client */}
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2">
                From
              </p>
              <p className="font-medium">{business?.businessName}</p>
              <p className="text-sm text-muted-foreground">
                {business?.businessEmail}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2">
                Bill To
              </p>
              <p className="font-medium">{client?.name}</p>
              <p className="text-sm text-muted-foreground">
                {client?.email}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4 bg-muted/40 rounded-xl p-4">
            <div>
              <p className="text-xs text-muted-foreground">Issue Date</p>
              <p className="font-medium">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{invoice.subtotal}</span>
              </div>

              {Number(invoice.taxTotal) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{invoice.taxTotal}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{invoice.total}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs uppercase text-muted-foreground mb-2">
                Notes
              </p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            {canPay && (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
              >
                {payMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay Now
              </Button>
            )}

            {pdfUrl && (
              <a href={pdfUrl} target="_blank" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Powered by Blade
      </p>
    </div>
  </div>
)

}
