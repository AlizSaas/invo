import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import { Input } from "../ui/input";

import { useState, useTransition } from "react";
import z from "zod";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { requestPasswordResetFn } from "@/data/auth/auth";


const forgetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgetPassword() {
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgetPasswordSchema,
    },
   onSubmit: ({ value }) => {
  startTransition(async () => {
    try {
      const result = await requestPasswordResetFn({
        data: { email: value.email },
      });
      toast.success(result.message);
      setSuccess(result.message);
    } catch (error: any) {
      console.log("Caught error:", error); // ← add this temporarily to see the shape

      // TanStack Start wraps server errors differently
      // Check multiple possible shapes
      const status =
        error?.status ||
        error?.response?.status ||
        error?.cause?.status;

      const message =
        error?.data?.message ||
        error?.message ||
        error?.data?.error;

      if (status === 429 || message?.includes("Too many requests")) {
        toast.error(
          message || "Too many requests. Please wait a minute and try again."
        );
      } else if (
        typeof error?.message === "string" &&
        error.message.includes("429")
      ) {
        toast.error("Too many requests. Please wait a minute and try again.");
      } else {
        toast.error(
          `Error requesting password reset: ${message || "Unknown error"}`
        );
      }
      setSuccess(null);
    }
  });
},
  });

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FieldGroup>
            <form.Field
              name="email"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="email@example.com"
                      type="email"
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />
          </FieldGroup>
          <Button type="submit" disabled={isPending} className="w-full mt-4">
            {isPending ? "Requesting..." : "Request Password Reset"}
          </Button>
        </form>
        {success && <p className="mt-4 text-green-600">{success}</p>}
      </CardContent>
    </Card>
  );
}