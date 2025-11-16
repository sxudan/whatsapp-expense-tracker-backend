// src/whatsapp/dto/whatsapp-message.dto.ts

export class WhatsappMessageDto {
  object: string;
  entry: Entry[];
}

export class Entry {
  id: string;
  changes: Change[];
}

export class Change {
  value: ChangeValue;
  field: string;
}

export class ChangeValue {
  messaging_product: string;
  metadata: Metadata;
  contacts?: Contact[];
  messages?: Message[];
}

export class Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

export class Contact {
  wa_id: string;
}

export class Message {
  from: string;
  id: string;
  timestamp: string;
  text: MessageText;
  type: string;
}

export class MessageText {
  body: string;
}
