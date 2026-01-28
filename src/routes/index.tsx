import Navbar from '@/components/navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { generateCodeFn, deleteCodeFn } from '@/data/code'
import { CODES_QUERY_KEY, codesQueryOptions } from '@/data/code/fetch-codes'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/')({ 
  component: App,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(codesQueryOptions(  ))
  },
})

function App() {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(codesQueryOptions())

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () => generateCodeFn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CODES_QUERY_KEY.codes
      })
      toast.success("Code generated successfully!")
    },
    onError: () => {
      toast.error("Failed to generate code")
    }
  })

  const { mutate: deleteCode, isPending: isDeleting } = useMutation({
    mutationFn: (codeId: string) => deleteCodeFn({ data: { codeId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CODES_QUERY_KEY.codes
      })
      toast.success("Code deleted successfully!")
    },
    onError: () => {
      toast.error("Failed to delete code")
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar/>
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-20 text-center md:py-32">
        <div className='space-y-3'>
          <Badge>🚀 Streamline Your Company's Bike Program</Badge>
          <h1 className='text-2xl font-bold'>
            Manage Bike Requests Made Simple
          </h1>
          <p className='text-muted-foreground max-w-xl'>
            Connect employees with bike sellers through our streamlined request platform. Perfect for companies promoting eco-friendly transportation and employee wellness.
          </p>
        </div>

        <div className='mt-10'>
          <Button disabled={isGenerating} onClick={() => generate()}>
            {isGenerating ? <Loader2 className='size-4 animate-spin'/> : "Generate Code"}
          </Button>
        </div>

        {data && data.length > 0 && (
          <div className='mt-20 w-full max-w-md'>
            <h2 className='mb-4 text-lg font-semibold'>Your Codes</h2>
            <div className='flex flex-col gap-3'>
              {data.map((code) => (
                <div key={code.id} className='flex w-full items-center justify-between rounded-md border p-4 shadow-sm'>
                  <div>
                    <p className='font-mono text-lg'>{code.code}</p>
                    <p className='text-sm text-muted-foreground'>
                      Created at: {new Date(code.createdAt).toLocaleString()}
                    </p>
                    <span>
                      {code.status === "pending" ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Badge variant="default">Success</Badge>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={isDeleting}
                    onClick={() => deleteCode(code.id)}
                  >
                    {isDeleting ? (
                      <Loader2 className='size-4 animate-spin'/>
                    ) : (
                      <Trash2 className='size-4'/>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}