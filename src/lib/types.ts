import  z  from 'zod';
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    
})

export const signupSchema = loginSchema.extend({
    fullName: z.string().min(4),
})  

// Type for Queue


export const CodeGeneratedMessageSchema = z.object({
  type: z.literal("CODE_GENERATED"),
  // Remove the data: z.object({ ... }) wrapper
  codeId: z.string(),
  userId: z.string(),
  code: z.string(),
  status: z.enum(["pending", "success"]),

  aiGenerated: z.boolean(),
  emailSend: z.boolean(),

  
});

export const QueueMessageSchema = z.discriminatedUnion("type", [
  CodeGeneratedMessageSchema,
]);

export type QueueMessage = z.infer<typeof QueueMessageSchema>;