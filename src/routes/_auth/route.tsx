import { buttonVariants } from '@/components/ui/button'
import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { checkSessionFn } from '@/data/session'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  beforeLoad: async () => {
    // if a user is found in the session, redirect to dashboard
    const session = await checkSessionFn()
    
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  }
})

function RouteComponent() {
  return (
    <div className='min-h-screen'>

        <div className='absolute top-8 left-8'>
            <Link to='/' className={buttonVariants({ variant: 'secondary' })}>
                <ArrowLeft className='size-4' />
            Back to Home
        
            
            </Link>

        </div>

     <div className='flex min-h-screen items-center justify-center'>
           <Outlet />
     </div>

    </div>
  )
}