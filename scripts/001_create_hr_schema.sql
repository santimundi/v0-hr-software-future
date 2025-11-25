-- HR Copilot Database Schema
-- This script creates all the necessary tables for the HR application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (extends auth.users)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  job_title TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  manager_id UUID REFERENCES employees(id),
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr_admin')),
  hire_date DATE NOT NULL,
  salary DECIMAL(12, 2),
  avatar_url TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TIME OFF & BENEFITS
-- ============================================

-- Time off balances
CREATE TABLE IF NOT EXISTS time_off_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vacation_days DECIMAL(4, 1) DEFAULT 15,
  sick_days DECIMAL(4, 1) DEFAULT 10,
  personal_days DECIMAL(4, 1) DEFAULT 3,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('vacation', 'sick', 'personal', 'bereavement', 'jury_duty', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(4, 1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benefits enrollments
CREATE TABLE IF NOT EXISTS benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('medical', 'dental', 'vision', 'life', '401k', 'hsa', 'fsa', 'other')),
  provider TEXT,
  description TEXT,
  monthly_cost_employee DECIMAL(10, 2),
  monthly_cost_employer DECIMAL(10, 2),
  coverage_details JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  coverage_level TEXT CHECK (coverage_level IN ('employee_only', 'employee_spouse', 'employee_children', 'family')),
  contribution_amount DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, benefit_id)
);

-- ============================================
-- DOCUMENTS & POLICIES
-- ============================================

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents/Policies
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID REFERENCES document_categories(id),
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  version TEXT DEFAULT '1.0',
  is_policy BOOLEAN DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'managers', 'hr_admin')),
  ai_summary TEXT,
  effective_date DATE,
  expiry_date DATE,
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee document access/signatures
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, document_id)
);

-- ============================================
-- AI CHAT & AUDIT
-- ============================================

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB,
  confidence_score DECIMAL(3, 2),
  data_sources JSONB,
  action_cards JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  data_accessed JSONB,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MANAGER SPECIFIC
-- ============================================

-- Team notes (manager only)
CREATE TABLE IF NOT EXISTS team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT CHECK (note_type IN ('performance', 'feedback', 'goal', 'general')),
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES employees(id),
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_for_next_period TEXT,
  employee_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'completed')),
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HR ADMIN SPECIFIC
-- ============================================

-- AI Safety settings
CREATE TABLE IF NOT EXISTS ai_safety_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy test scenarios
CREATE TABLE IF NOT EXISTS policy_test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  test_query TEXT NOT NULL,
  expected_behavior TEXT,
  test_role TEXT NOT NULL CHECK (test_role IN ('employee', 'manager', 'hr_admin')),
  result JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  created_by UUID REFERENCES employees(id),
  run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_employee ON audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
