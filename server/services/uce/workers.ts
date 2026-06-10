import { Worker, Job } from 'bullmq';
import { redisConnection, UceJobPayload, communicationQueue } from './queue';
import { db } from '../../db';
import { communicationChannels, deliveryLogs, communications } from '@shared/schema';
import { sendSms, sendWhatsApp, sendEmail } from '../messaging';
import { eq } from 'drizzle-orm';

/**
 * Intelligent Router that processes UCE Jobs
 */
export const communicationWorker = new Worker<UceJobPayload>(
  'communication-queue',
  async (job: Job<UceJobPayload>) => {
    const { communicationId, recipientId, channel, templateName, templateData, tenantId } = job.data;
    
    console.log(`[UCE Worker] Processing job ${job.id} for communication ${communicationId} on channel ${channel}`);

    // Mark attempt in communication_channels
    const [channelRecord] = await db.insert(communicationChannels).values({
      communicationId,
      channel,
      attempted: true,
      deliveryTime: new Date(),
    }).returning();

    // Reconstruct message (In a real system, look up templateName from message_templates and render with templateData)
    const messageBody = `[${templateName}] ` + JSON.stringify(templateData);

    let dispatchResult: { success: boolean; error?: string; messageId?: string } = { success: false, error: 'Unknown channel', messageId: '' };

    try {
      // Fetch Tenant Configuration to pass down
      let commConfig = null;
      if (tenantId) {
        const { tenants } = await import('@shared/schema');
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (tenant && tenant.settings && (tenant.settings as any).communication) {
          commConfig = (tenant.settings as any).communication[channel];
        }
      }

      // Dispatch based on channel
      switch (channel) {
        case 'whatsapp':
          dispatchResult = await sendWhatsApp({ to: templateData.phone || '', message: messageBody, config: commConfig });
          break;
        case 'sms':
          dispatchResult = await sendSms({ to: templateData.phone || '', message: messageBody, config: commConfig });
          break;
        case 'email':
          dispatchResult = await sendEmail({ to: templateData.email || '', subject: 'VaxPlan Notification', text: messageBody, config: commConfig });
          break;
        // Mock push & voice
        case 'push':
        case 'voice':
          console.log(`[UCE] Mocking ${channel} dispatch to ${recipientId}`);
          dispatchResult = { success: true, messageId: `mock-${channel}-${Date.now()}` };
          break;
      }

      // Log delivery result
      await db.insert(deliveryLogs).values({
        communicationId,
        provider: channel,
        status: dispatchResult.success ? 'delivered' : 'failed',
        response: dispatchResult.error || dispatchResult.messageId || 'Success',
      });

      if (dispatchResult.success) {
        // Update communication channel status
        await db.update(communicationChannels)
          .set({ delivered: true, responseCode: dispatchResult.messageId })
          .where(eq(communicationChannels.id, channelRecord.id));

        // Mark communication as completed
        await db.update(communications)
          .set({ status: 'completed' })
          .where(eq(communications.id, communicationId));
          
        return { status: 'delivered', channel };
      } else {
        throw new Error(dispatchResult.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error(`[UCE Worker] Failed dispatching on ${channel}:`, err.message);
      
      // FALLBACK LOGIC
      // If WhatsApp fails, try SMS. If SMS fails, try Push, etc.
      let nextChannel: UceJobPayload['channel'] | null = null;
      let delayMs = 5 * 60 * 1000; // default 5 minutes delay for fallback
      
      switch (channel) {
        case 'whatsapp':
          nextChannel = 'sms';
          delayMs = 0; // fallback to SMS immediately
          break;
        case 'sms':
          nextChannel = 'push';
          break;
        case 'push':
          nextChannel = 'email';
          break;
        case 'email':
          nextChannel = 'voice';
          break;
      }

      if (nextChannel) {
        console.log(`[UCE Worker] Fallback engaged: Enqueuing ${nextChannel} for communication ${communicationId}`);
        await communicationQueue.add(`fallback-${nextChannel}`, {
          ...job.data,
          channel: nextChannel
        }, { delay: delayMs });
      } else {
        // Ultimate failure
        await db.update(communications)
          .set({ status: 'failed' })
          .where(eq(communications.id, communicationId));
      }
      
      throw err;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
  }
);

communicationWorker.on('completed', job => {
  console.log(`[UCE Worker] Job ${job.id} completed successfully`);
});

communicationWorker.on('failed', (job, err) => {
  console.error(`[UCE Worker] Job ${job?.id} failed:`, err);
});
