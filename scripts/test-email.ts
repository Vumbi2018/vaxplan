import { dispatchNotification } from '../server/services/uce/index.js';
import { db } from '../server/db.js';
import { clients, tenants } from '../shared/schema.js';
import { eq, isNotNull } from 'drizzle-orm';

async function run() {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    
    // Pick the first client and temporarily set their email.
    const [client] = await db.select().from(clients).where(isNotNull(clients.name)).limit(1);

    if (!client) {
      console.log("No client found in DB to test with.");
      process.exit(1);
    }

    const testEmail = "lawrencemukombo2@gmail.com";
    await db.update(clients)
      .set({ email: testEmail, preferredLanguage: 'en', preferredChannel: 'email' })
      .where(eq(clients.id, client.id));

    console.log(`Updated client ${client.name} with test email: ${testEmail}`);

    console.log("Dispatching test notification to UCE queue...");
    const result = await dispatchNotification({
      tenantId: tenant.id,
      recipientId: client.id,
      messageType: 'test_email',
      priority: 'high',
      templateName: 'test_notification',
      templateData: {
        child_name: client.name,
        subject: "VaxPlan Notification Engine Setup Successful!",
        messageText: "Hello! This is a test message dispatched from the Unified Communication Engine powered by Redis and Nodemailer."
      }
    });

    console.log(`Dispatched successfully! Job added to Queue with Communication ID: ${result.communicationId}`);
  } catch (err) {
    console.error("Test dispatch failed:", err);
  } finally {
    setTimeout(() => process.exit(0), 3000); // Wait 3s for Redis to flush
  }
}

run();
