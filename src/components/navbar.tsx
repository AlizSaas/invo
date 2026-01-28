import { Link } from '@tanstack/react-router'

import { signOut, useSession } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Button, buttonVariants } from './ui/button'
import { ThemeToggle } from './theme/theme-toggle'
import { BikeIcon } from 'lucide-react'


export default function Navbar() {
    const {data:session,isPending} = useSession()
    async function hanleSignOut () {
        await signOut({
            fetchOptions:{
                onSuccess: () => {
                    toast.success('Successfully logged out')
                },
                onError: ({error}) => {
                    toast.error(`Error logging out: ${error.message}`)
                }
            }
        })
    }
  return (
  <nav  className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-md supports-backdrop-filter:bg-background/40">
    <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
            <BikeIcon className='size-8 rounded-4xl '/>
            <h1 className='text-lg font-semibold'>
               Blade
            </h1>

        </div>

    <div className='flex items-center gap-3'>
        <ThemeToggle />
        {isPending ? null: session ? ( // if session exists
        <> 
       

            <Button 
            onClick={hanleSignOut}
            variant={'secondary'}>
                Logout
            </Button>
             <Link className={buttonVariants()} to="/">
          Dashboard
        </Link>
            </>
        ):(
      <>
        <Link className={buttonVariants({variant: 'ghost'})} to="/login">
          Login
        </Link>
        <Link className={buttonVariants()} to="/signup">
            Sign Up
        </Link>
      </>
        )}

 
    </div>
        
    </div>

  </nav>
  )
}