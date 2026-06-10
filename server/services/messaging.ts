import nodemailer from 'nodemailer';
import { redisConnection } from './uce/queue';
import { db } from '../db';
import { communicationLogs } from '../../shared/schema';

/**
 * Modular Messaging Service
 * 
 * Provides template integration for external messaging gateways (SMS, WhatsApp, Email).
 * Replace the mocked `console.log` lines with actual API calls using SDKs
 * (e.g., twilio, africastalking, nodemailer) once you have your API keys.
 */

interface SendSmsOptions {
  to: string;
  message: string;
  config?: any;
}

interface SendWhatsAppOptions {
  to: string; // e.g., '+260971234567'
  message: string;
  config?: any;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
  config?: any;
}

/**
 * Dispatches an SMS using the configured provider.
 */
export async function sendSms(options: SendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, message, config } = options;
    const provider = config?.provider || process.env.SMS_PROVIDER || 'mock'; // 'twilio', 'africastalking', 'mock'
    
    console.log(`[Messaging Service] Preparing to send SMS to ${to} via provider: ${provider}`);
    
    if (provider === 'mock') {
      console.log(`[Mock SMS] To: ${to} | Body: ${message}`);
      return { success: true, messageId: `mock-sms-${Date.now()}` };
    }
    
    if (provider === 'redis') {
      const channelName = config?.redisChannel || process.env.REDIS_SMS_CHANNEL || 'outbound_sms';
      await redisConnection.publish(channelName, JSON.stringify({
        to,
        message,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Redis SMS] Published to channel ${channelName} | To: ${to}`);
      return { success: true, messageId: `redis-sms-${Date.now()}` };
    }

    if (provider === 'twilio') {
      const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = config?.senderNumber || process.env.TWILIO_PHONE_NUMBER;
      
      if (!accountSid || !authToken || !fromPhone) {
        throw new Error("Missing Twilio credentials. Please check your settings.");
      }
      
      // @ts-ignore - Dynamically import so it doesn't crash if not installed
      const twilio = (await import('twilio')).default || (await import('twilio'));
      const client = twilio(accountSid, authToken);
      
      const res = await client.messages.create({ body: message, from: fromPhone, to });
      return { success: true, messageId: res.sid };
    }
    
    if (provider === 'africastalking') {
      // 1. Install: npm install africastalking
      // 2. Import and initialize with API Key & Username
      const apiKey = config?.apiKey || process.env.AFRICASTALKING_API_KEY;
      const username = config?.username || process.env.AFRICASTALKING_USERNAME;
      const senderId = config?.senderId || process.env.AFRICASTALKING_SENDER_ID;
      // 3. Call sms.send({ to: [to], message, from: senderId })
      return { success: false, error: "Africa's Talking SDK not installed. Set AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME, and AFRICASTALKING_SENDER_ID env vars and install the 'africastalking' npm package." };
    }
    
    return { success: false, error: "Unknown SMS provider" };
  } catch (error: any) {
    console.error("[Messaging Service] Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Dispatches a WhatsApp message using the configured provider (e.g., Twilio WhatsApp API, Meta Graph API).
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, message, config } = options;
    const provider = config?.provider || process.env.WHATSAPP_PROVIDER || 'mock'; 
    
    console.log(`[Messaging Service] Preparing to send WhatsApp to ${to} via provider: ${provider}`);
    
    if (provider === 'mock') {
      console.log(`[Mock WhatsApp] To: ${to} | Body: ${message}`);
      return { success: true, messageId: `mock-wa-${Date.now()}` };
    }
    
    if (provider === 'redis') {
      const channelName = config?.redisChannel || process.env.REDIS_WHATSAPP_CHANNEL || 'outbound_whatsapp';
      await redisConnection.publish(channelName, JSON.stringify({
        to,
        message,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Redis WhatsApp] Published to channel ${channelName} | To: ${to}`);
      return { success: true, messageId: `redis-wa-${Date.now()}` };
    }

    if (provider === 'twilio') {
      const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = config?.senderNumber || process.env.TWILIO_WHATSAPP_NUMBER;
      
      if (!accountSid || !authToken || !fromPhone) {
        throw new Error("Missing Twilio credentials. Please check your settings.");
      }
      
      // @ts-ignore
      const twilio = (await import('twilio')).default || (await import('twilio'));
      const client = twilio(accountSid, authToken);
      
      // Twilio WhatsApp uses the prefix "whatsapp:" for numbers
      const safeFromPhone = fromPhone.startsWith('whatsapp:') ? fromPhone : `whatsapp:${fromPhone}`;
      const safeToPhone = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const res = await client.messages.create({ 
        body: message, 
        from: safeFromPhone, 
        to: safeToPhone 
      });
      return { success: true, messageId: res.sid };
    }
    
    return { success: false, error: "Unknown WhatsApp provider" };
  } catch (error: any) {
    console.error("[Messaging Service] Failed to send WhatsApp:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Dispatches an Email using Nodemailer
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, subject, text, html, attachments, config } = options;
    
    const host = config?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = config?.port || Number(process.env.SMTP_PORT) || 465;
    const user = config?.user || process.env.SMTP_USER;
    const pass = config?.pass || process.env.SMTP_PASS;
    const from = config?.from || process.env.SMTP_FROM || `"VaxPlan Notifications" <${user}>`;

    // Check if SMTP configs exist to avoid breaking if they are missing
    if (!user || !pass) {
      console.log(`[Mock Email] SMTP config missing. Mocking email to: ${to} | Subject: ${subject}`);
      return { success: true, messageId: `mock-email-${Date.now()}` };
    }
    
    console.log(`[Messaging Service] Preparing to send Email to ${to} via Nodemailer`);

    const transporter = nodemailer.createTransport({
      host: host,
      port: Number(port),
      secure: Number(port) === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });

    const info = await transporter.sendMail({
      from: from,
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.log(`[Messaging Service] Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Messaging Service] Failed to send Email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Intelligent Omnichannel Dispatcher
 * Automatically logs to `communicationLogs` and attempts fallback if enabled.
 */
export async function dispatchWithFallback(options: {
  tenantId: string;
  primaryChannel: 'whatsapp' | 'sms' | 'email';
  destination: string;
  message: string;
  subject?: string;
  tenantSettings: any;
}): Promise<{ success: boolean; channelUsed: string; logId: string; error?: string }> {
  const { tenantId, primaryChannel, destination, message, subject, tenantSettings } = options;
  const commConfig = tenantSettings?.communication || {};
  const isSmartRouting = commConfig.smartRouting === true;

  const tryChannel = async (channel: 'whatsapp' | 'sms' | 'email', fallbackTriggered: boolean) => {
    let result;
    if (channel === 'whatsapp') {
      result = await sendWhatsApp({ to: destination, message, config: commConfig.whatsapp });
    } else if (channel === 'sms') {
      result = await sendSms({ to: destination, message, config: commConfig.sms });
    } else {
      result = await sendEmail({ to: destination, subject: subject || 'VaxPlan Notification', text: message, config: commConfig.email });
    }

    // Log the attempt
    const [log] = await db.insert(communicationLogs).values({
      tenantId,
      channel,
      destination,
      status: result.success ? 'delivered' : 'failed',
      providerResponse: result.error || result.messageId || 'Success',
      fallbackTriggered,
    }).returning({ id: communicationLogs.id });

    return { result, logId: log.id, channel };
  };

  // 1. Try Primary
  const primary = await tryChannel(primaryChannel, false);
  if (primary.result.success || !isSmartRouting) {
    return { success: primary.result.success, channelUsed: primary.channel, logId: primary.logId, error: primary.result.error };
  }

  // 2. Fallback Sequence: whatsapp -> sms -> email
  const fallbackOrder: ('whatsapp'|'sms'|'email')[] = ['whatsapp', 'sms', 'email'];
  const currentIndex = fallbackOrder.indexOf(primaryChannel);
  
  for (let i = currentIndex + 1; i < fallbackOrder.length; i++) {
    const nextChannel = fallbackOrder[i];
    console.log(`[Omnichannel Routing] ${fallbackOrder[i-1]} failed. Falling back to ${nextChannel}...`);
    const fallback = await tryChannel(nextChannel, true);
    if (fallback.result.success) {
      return { success: true, channelUsed: fallback.channel, logId: fallback.logId };
    }
  }

  // All failed
  return { success: false, channelUsed: primaryChannel, logId: primary.logId, error: "All fallback routes failed" };
}
