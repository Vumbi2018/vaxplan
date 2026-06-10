import { db } from '../../db';
import { communications, clients } from '@shared/schema';
import { communicationQueue, UceJobPayload } from './queue';
import { eq } from 'drizzle-orm';

export interface DispatchNotificationArgs {
  tenantId: string;
  recipientId: string;
  messageType: string;
  priority?: 'high' | 'medium' | 'low' | 'critical' | 'emergency';
  templateName: string;
  templateData: Record<string, any>;
}

/**
 * Main entry point for the Unified Communication Engine (UCE)
 * Evaluates the recipient and enqueues the first attempt based on priority rules.
 */
export async function dispatchNotification(args: DispatchNotificationArgs): Promise<{ communicationId: string }> {
  const { tenantId, recipientId, messageType, priority = 'medium', templateName, templateData } = args;

  // 1. Log intent in communications table
  const [comm] = await db.insert(communications).values({
    tenantId,
    recipientId,
    messageType,
    priority,
    status: 'pending',
  }).returning();

  // 2. Determine initial channel routing
  // Fetch client preferences
  const [client] = await db.select().from(clients).where(eq(clients.id, recipientId));
  
  if (!client) {
    throw new Error('Recipient not found');
  }

  // Inject recipient info into template data
  const enrichedData = {
    ...templateData,
    phone: client.contactPhone,
    email: client.email,
    language: client.preferredLanguage,
    name: client.name
  };

  // Default initial channel logic based on hierarchy or preference
  let initialChannel: UceJobPayload['channel'] = 'sms';

  if (client.preferredChannel && ['whatsapp', 'sms', 'push', 'email', 'voice'].includes(client.preferredChannel)) {
    initialChannel = client.preferredChannel as UceJobPayload['channel'];
  } else if (priority === 'emergency') {
    // For emergencies, we might enqueue multiple jobs in parallel. 
    // Here we'll just start with SMS as an MVP.
    initialChannel = 'sms'; 
  } else if (client.whatsappAvailable) {
    initialChannel = 'whatsapp';
  } else if (client.hasApp) {
    initialChannel = 'push';
  } else if (client.contactPhone) {
    initialChannel = 'sms';
  } else if (client.email) {
    initialChannel = 'email';
  }

  const jobPayload: UceJobPayload = {
    communicationId: comm.id,
    recipientId,
    messageType,
    channel: initialChannel,
    templateName,
    templateData: enrichedData,
    tenantId,
  };

  // 3. Enqueue job
  await communicationQueue.add(`send-${initialChannel}`, jobPayload);

  return { communicationId: comm.id };
}
