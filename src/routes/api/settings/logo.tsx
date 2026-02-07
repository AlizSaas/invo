import { authMiddleware } from '@/middlewares/dependencies'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/settings/logo')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ context }) => {
        const userId = context.user.id
        const db = context.db
        const env = context.env

        // Get the user's settings to find the logo extension
        const userSettings = await db.query.settings.findFirst({
          where: eq(settings.userId, userId),
        })

        if (!userSettings?.logoUrl) {
          return new Response('No logo found', { status: 404 })
        }

        // Try to get the logo from R2 storage
        // Check for different extensions
        const extensions = ['svg', 'png', 'jpg']
        
        for (const ext of extensions) {
          const key = `${userId}/branding/logo.${ext}`
          const object = await env.STORAGE.get(key)
          
          if (object) {
            return new Response(object.body, {
              headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/png',
                'Cache-Control': 'public, max-age=31536000',
              },
            })
          }
        }

        return new Response('Logo file not found in storage', { status: 404 })
      },
    },
  },
})