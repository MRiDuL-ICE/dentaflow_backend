export interface RabbitMQEvent {
  type: string;
  payload: Record<string, unknown>;
  clinicId?: string;
  timestamp: string;
}

export const EXCHANGES = {
  DENTAFLOW: 'dentaflow.events',
} as const;

export const QUEUES = {
  APPOINTMENT_EVENTS: 'appointment.events',
  TREATMENT_EVENTS: 'treatment.events',
  INVENTORY_EVENTS: 'inventory.events',
  NOTIFICATION_EVENTS: 'notification.events',
} as const;

export const ROUTING_KEYS = {
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  TREATMENT_COMPLETED: 'treatment.completed',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVOICE_OVERDUE: 'invoice.overdue',
} as const;
