import { Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  WhatsAppMessage,
  WhatsappMessageDto,
  WhatsappTextMessage,
  WhatsappImageMessage,
} from './dto';
import { UserService } from '../user/user.service';
import { ExpenseHandlerService } from '../expense-handler/expense-handler.service';
import { Platform } from '../response-handler/response-handler.service';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly userService: UserService,
    private readonly expenseHandlerService: ExpenseHandlerService,
  ) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    } else {
      return 'Forbidden';
    }
  }

  async sendWhatsappMessage(phoneNumberId: string, message: WhatsAppMessage) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    const url = `${process.env.WHATSAPP_BASE_API_URL}/v${process.env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    console.log('Sending WhatsApp message:', url);

    try {
      const response = await axios.post(url, message, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Message sent:', response.data);
    } catch (err) {
      console.error(
        'Error sending WhatsApp message:',
        (err as AxiosError).response?.data || (err as Error).message,
      );
    }
  }

  async handleIncomingMessage(body: WhatsappMessageDto) {
    console.log('Incoming WhatsApp message:', JSON.stringify(body, null, 2));

    const changeValue = body.entry[0].changes[0].value;
    const message = changeValue.messages?.[0];
    const sender = message?.from;
    const myNumber = changeValue.metadata.display_phone_number;
    const contact = changeValue.contacts?.[0];

    // Ignore messages sent by yourself or no message or sender found
    if (!message || !sender || !contact) {
      console.log('No message or sender found');
      return { status: 'ignored' };
    }
    if (sender === myNumber) {
      console.log('Message sent by yourself');
      return { status: 'ignored' };
    }

    // Only process text messages
    if (message.type !== 'text' || !message.text?.body) {
      console.log('Message is not a text message');
      return { status: 'ignored' };
    }

    const messageText = message.text.body;
    const phoneNumberId = changeValue.metadata.phone_number_id;

    try {
      // Find or create user by phone number
      const user = await this.userService.findOrCreateByPhoneNumber(
        contact.wa_id,
      );

      // Process message through expense handler service
      const response = await this.expenseHandlerService.processMessage(
        messageText,
        user.id,
        Platform.WHATSAPP,
      );

      // Check if response includes an image URL (for reports with charts)
      const responseWithImage = response as {
        imageUrl?: string;
        caption?: string;
        content: string;
      };
      if (responseWithImage.imageUrl) {
        // Send image message with chart
        const imageMessage: WhatsappImageMessage = {
          messaging_product: 'whatsapp',
          to: contact.wa_id,
          type: 'image',
          image: {
            link: responseWithImage.imageUrl,
            caption: responseWithImage.caption || response.content,
          },
        };

        console.log('Whatsapp image message:', imageMessage);
        await this.sendWhatsappMessage(phoneNumberId, imageMessage);
      } else {
        // Send text message directly (extract content from response)
        const whatsappMessage: WhatsappTextMessage = {
          messaging_product: 'whatsapp',
          to: contact.wa_id,
          text: { body: response.content },
        };

        console.log('Whatsapp message:', whatsappMessage);
        await this.sendWhatsappMessage(phoneNumberId, whatsappMessage);
      }

      return { status: 'processed' };
    } catch (error) {
      console.error('Error processing message:', error);

      // Send error message to user
      const errorMessage: WhatsappTextMessage = {
        messaging_product: 'whatsapp',
        to: contact.wa_id,
        text: {
          body: 'Sorry, I encountered an error processing your message. Please try again.',
        },
      };
      await this.sendWhatsappMessage(phoneNumberId, errorMessage);

      return { status: 'error', error: (error as Error).message };
    }
  }
}
