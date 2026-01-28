import handler from "@tanstack/react-start/server-entry";

import { createDb, getDb } from "./db";
import {  setAuth } from "./lib/auth";
import { QueueMessageSchema } from "./lib/types";
import { scheduleCodeEvaluation } from "./helpers";


export  { CodeEvalutionScheduler } from "./durable-object";
export  { CodeEvalutionWorkflow } from "./workflows";





export default {
  fetch(request: Request, env: Env, executionCtx: ExecutionContext) {
    // Initialize db first - available via getDb()
    createDb(env.DATABASE_URL);
setAuth({
  secret: env.BETTER_AUTH_SECRET,
  adapter:{
    drizzleDb: getDb(),
    provider: "pg",
  }
})
    

    return handler.fetch(request, {
      context: {
              env,
      waitUntil: executionCtx.waitUntil.bind(executionCtx),    
        fromFetch: true,
        

      },
      
      



    });

  

    
  },
async queue(batch: MessageBatch<unknown>, env: Env) {
    console.log(`Processing ${batch.messages.length} messages`);

 
  

    for (const message of batch.messages) {
      try {
        const parsedEvent = QueueMessageSchema.safeParse(message.body);

        if (parsedEvent.success) {
          const event = parsedEvent.data;

          if (event.type === 'CODE_GENERATED') {
            console.log(`Processing code ${event.codeId}...`);

            // ✅ Call the Durable Object to schedule evaluation
            await scheduleCodeEvaluation(env, {
              codeId: event.codeId,
              userId: event.userId,
              status: event.status,
              aiGenerated: event.aiGenerated,
              emailSend: event.emailSend
            });

            console.log(`Scheduled evaluation for code ${event.codeId}`);
          }
        } else {
          console.error('Invalid message format:', JSON.stringify(parsedEvent.error));
          console.log('Received body:', JSON.stringify(message.body));
        }

        message.ack();

      } catch (error) {
        console.error('Error processing message:', error);
        message.retry();
      }
    }
  }
  
};
