// Platform-agnostic response types

export enum MessageFormat {
  TEXT = 'text',
  TEMPLATE = 'template',
  MARKDOWN = 'markdown',
}

export interface BaseResponse {
  format: MessageFormat;
  content: string;
  metadata?: Record<string, any>;
}

export interface TextResponse extends BaseResponse {
  format: MessageFormat.TEXT;
  content: string;
}

export interface TemplateResponse extends BaseResponse {
  format: MessageFormat.TEMPLATE;
  content: string;
  templateName?: string;
  templateParams?: Record<string, any>;
}

export interface ImageResponse extends BaseResponse {
  format: MessageFormat.TEXT;
  content: string;
  imageUrl?: string;
  caption?: string;
}

export type PlatformResponse = TextResponse | TemplateResponse | ImageResponse;
