export interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  [key: string]: unknown; // covers po.* columns you didn't enumerate
}
