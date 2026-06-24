export interface TreatmentPlanRow {
  id: string;
  patient_id: string;
  title: string;
  notes: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  [key: string]: unknown;
}
