import { authMiddleware } from '@/middlewares/dependencies'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/upload')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      POST: async ({ context, request }) => {
        const userId = context.user.id
        const db = context.db
        const formData = await request.formData()
        const fileEntry = formData.get('logo')

        if (!fileEntry || typeof fileEntry === 'string') {
          return new Response(JSON.stringify({ error: 'No logo file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const file = fileEntry as File

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: 'Invalid file type. Allowed: PNG, JPEG, SVG' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'File size must be less than 2MB' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Determine file extension
        const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : 'jpg'
        const key = `${userId}/branding/logo.${ext}`

        const env = context.env

        // Upload to R2
        await env.STORAGE.put(key, await file.arrayBuffer(), {
          httpMetadata: {
            contentType: file.type,
          },
        })

        const logoUrl = `${env.BETTER_AUTH_URL}/api/settings/logo`
        const now = new Date()

        // Update settings with logo URL using Drizzle
        await db
          .update(settings)
          .set({
            logoUrl: logoUrl,
            updatedAt: now,
          })
          .where(eq(settings.userId, userId))

        return new Response(JSON.stringify({
          data: {
            message: 'Logo uploaded successfully',
            logo_url: logoUrl,
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
