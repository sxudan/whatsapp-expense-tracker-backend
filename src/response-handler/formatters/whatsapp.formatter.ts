import { Injectable } from '@nestjs/common';
import {
  PlatformResponse,
  MessageFormat,
  TextResponse,
} from '../types/response.types';
import {
  WhatsAppMessage,
  WhatsappTextMessage,
  WhatsappTemplateMessage,
} from '../../whatsapp/dto';

@Injectable()
export class WhatsAppFormatter {
  format(response: PlatformResponse, recipientId: string): WhatsAppMessage {
    if (response.format === MessageFormat.TEMPLATE) {
      // Format template, but it may fallback to text if template name is missing
      return this.formatTemplate(response, recipientId);
    }
    // Default to text format
    return this.formatText(response, recipientId);
  }

  private formatText(
    response: TextResponse,
    recipientId: string,
  ): WhatsappTextMessage {
    return {
      messaging_product: 'whatsapp',
      to: recipientId,
      text: { body: response.content },
    };
  }

  private formatTemplate(
    response: PlatformResponse & { format: MessageFormat.TEMPLATE },
    recipientId: string,
  ): WhatsappTemplateMessage | WhatsappTextMessage {
    // Only use template if a valid template name is provided
    // WhatsApp templates must be pre-approved in Meta Business Manager
    if (!response.templateName) {
      // Fallback to text if no template name provided
      return this.formatText(
        {
          format: MessageFormat.TEXT,
          content: response.content,
        },
        recipientId,
      );
    }

    // Build template components from templateParams
    const components = this.buildTemplateComponents(response.templateParams);

    return {
      messaging_product: 'whatsapp',
      to: recipientId,
      type: 'template',
      template: {
        name: response.templateName,
        language: { code: 'en_US' },
        components,
      },
    };
  }

  private buildTemplateComponents(
    params?: Record<string, any>,
  ): any[] | undefined {
    if (!params || Object.keys(params).length === 0) {
      return undefined;
    }

    // Build body parameters from templateParams
    const bodyParams = Object.entries(params)
      .filter(([key]) => !key.startsWith('_')) // Skip metadata keys
      .map(([, value]) => ({
        type: 'text',
        text: String(value),
      }));

    if (bodyParams.length === 0) {
      return undefined;
    }

    return [
      {
        type: 'body',
        parameters: bodyParams,
      },
    ];
  }
}
