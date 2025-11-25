export type Role = "employee" | "manager" | "hr_admin"
export type TimeOffType = "vacation" | "sick" | "personal" | "bereavement" | "jury_duty" | "other"
export type TimeOffStatus = "pending" | "approved" | "denied" | "cancelled"
export type BenefitType = "medical" | "dental" | "vision" | "life" | "401k" | "hsa" | "fsa" | "other"
export type CoverageLevel = "employee_only" | "employee_spouse" | "employee_children" | "family"
export type Visibility = "all" | "managers" | "hr_admin"
export type RiskLevel = "low" | "medium" | "high"

export interface Department {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_title: string
  department_id: string | null
  manager_id: string | null
  role: Role
  hire_date: string
  salary: number | null
  avatar_url: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffBalance {
  id: string
  employee_id: string
  vacation_days: number
  sick_days: number
  personal_days: number
  year: number
  created_at: string
  updated_at: string
}

export interface TimeOffRequest {
  id: string
  employee_id: string
  request_type: TimeOffType
  start_date: string
  end_date: string
  days_requested: number
  reason: string | null
  status: TimeOffStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface Benefit {
  id: string
  name: string
  type: BenefitType
  provider: string | null
  description: string | null
  monthly_cost_employee: number | null
  monthly_cost_employer: number | null
  coverage_details: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeBenefit {
  id: string
  employee_id: string
  benefit_id: string
  enrollment_date: string
  coverage_level: CoverageLevel | null
  contribution_amount: number | null
  status: "active" | "pending" | "cancelled"
  created_at: string
  updated_at: string
}

export interface DocumentCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  created_at: string
}

export interface Document {
  id: string
  title: string
  category_id: string | null
  content: string | null
  file_url: string | null
  file_type: string | null
  version: string
  is_policy: boolean
  visibility: Visibility
  ai_summary: string | null
  effective_date: string | null
  expiry_date: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ChatConversation {
  id: string
  employee_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: "user" | "assistant" | "system"
  content: string
  citations: Record<string, unknown>[] | null
  confidence_score: number | null
  data_sources: Record<string, unknown>[] | null
  action_cards: Record<string, unknown>[] | null
  created_at: string
}

export interface AuditLog {
  id: string
  employee_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  data_accessed: Record<string, unknown> | null
  risk_level: RiskLevel | null
  created_at: string
}

export interface TeamNote {
  id: string
  manager_id: string
  employee_id: string
  note: string
  note_type: "performance" | "feedback" | "goal" | "general" | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id: string
  review_period_start: string
  review_period_end: string
  overall_rating: number | null
  strengths: string | null
  areas_for_improvement: string | null
  goals_for_next_period: string | null
  employee_comments: string | null
  status: "draft" | "submitted" | "acknowledged" | "completed"
  submitted_at: string | null
  acknowledged_at: string | null
  created_at: string
  updated_at: string
}

export interface AISafetySetting {
  id: string
  setting_key: string
  setting_value: Record<string, unknown>
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
