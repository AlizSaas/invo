 export async function scheduleCodeEvaluation(env: Env, event: {
  codeId: string;
  userId: string;
  status: 'pending' | 'success';
  aiGenerated: boolean;
  emailSend: boolean;
}) {
  // Get Durable Object instance for this code
  const doId = env.CODE_SCHEDULAR.idFromName(event.codeId);
  const stub = env.CODE_SCHEDULAR.get(doId);
  
  // Schedule the evaluation
  await stub.collectCodeData({
    codeId: event.codeId,
    userId: event.userId,
    status: event.status,
    aiGenerated: event.aiGenerated,
    emailSend: event.emailSend
  });
  
  console.log(`Scheduled evaluation for code ${event.codeId}`);
}
