// src/whatsapp/dto/send-template-message.dto.ts

export type WhatsappTemplateMessage = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: Template;
  text?: never;
};

export type WhatsappTextMessage = {
  messaging_product: 'whatsapp';
  to: string;
  text: { body: string };
  type?: never;
};

export type WhatsappImageMessage = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'image';
  image: {
    link?: string;
    id?: string;
    caption?: string;
  };
  text?: never;
};

export type WhatsAppMessage =
  | WhatsappTemplateMessage
  | WhatsappTextMessage
  | WhatsappImageMessage;

export interface Template {
  name: string;
  language: Language;
  components?: Component[]; // optional, if you want to add buttons, variables, etc.
}

export interface Language {
  code: string; // e.g., 'en_US'
}

export interface Component {
  type: string; // e.g., 'body', 'header', 'button'
  parameters?: Parameter[];
}

export interface Parameter {
  type: string; // e.g., 'text', 'currency', etc.
  text?: string;
}
