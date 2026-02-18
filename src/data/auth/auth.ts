import { createServerFn } from "@tanstack/react-start";

import { authClient } from "@/lib/auth-client";
import { forgetPasswordRateLimiter } from "@/middlewares/rate-limited";

export const requestPasswordResetFn = createServerFn()
  .middleware([forgetPasswordRateLimiter])
  .inputValidator((data: { email: string }) => {
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error("Invalid email address");
    }
    return data;
  })
  .handler(async ({ data }) => {
    // Call your auth library server-side here
    // This depends on your Better Auth setup — you may need the server-side client
    await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });

    // Always return the same message to avoid email enumeration
    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  });