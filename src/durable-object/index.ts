import { DurableObject } from "cloudflare:workers";
import moment from 'moment';

interface CodeData {
    codeId: string;
    userId: string;
    status: 'pending' | 'success';
  
    aiGenerated: boolean;
    emailSend: boolean;
    
}

export class CodeEvalutionScheduler extends DurableObject<Env>{
    codeData: CodeData | undefined


    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        ctx.blockConcurrencyWhile(async () => {
            this.codeData = await ctx.storage.get<CodeData>('codeData');
        })
    }

    async collectCodeData(data: CodeData) {
        this.codeData = data;
        await this.ctx.storage.put('codeData', this.codeData); // Persist the data
           const alarm = await this.ctx.storage.getAlarm()

           if(!alarm) {
            // 5 minutes later
            const threeMinutesLater = moment().add(3, 'minutes').valueOf();
            await this.ctx.storage.setAlarm(threeMinutesLater);
           }


    }

   async alarm() {
        console.log("Alarm triggered for code evaluation");
        
        // ✅ Read from storage (handles eviction)
        const codeData = await this.ctx.storage.get<CodeData>('codeData');
        
        if (!codeData) {
            console.error("No code data found in storage");
            return;
        }

        try {
            // ✅ Trigger the workflow
            await this.env.CODE_WORKFLOW.create({
                params: {
                    codeId: codeData.codeId,
                    userId: codeData.userId,
                    status: codeData.status,
                    aiGenerated: codeData.aiGenerated,
                    emailSend: codeData.emailSend
                }
            });

            console.log(`Workflow created for code ${codeData.codeId}`);
            
            // ✅ Clean up after success
            await this.ctx.storage.delete('codeData');
            this.codeData = undefined;
            
        } catch (error) {
            console.error('Failed to create workflow:', error);
            throw error;
        }
    }
}