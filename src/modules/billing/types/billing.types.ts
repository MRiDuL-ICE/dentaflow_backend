export interface InvoiceRow {
  id: string;
  patient_id: string;
  plan_id: string | null;
  appointment_id: string | null;
  invoice_number: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  [key: string]: unknown;
}
