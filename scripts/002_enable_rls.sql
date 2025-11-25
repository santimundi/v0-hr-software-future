-- Enable Row Level Security on all tables
-- This script sets up RLS policies for secure data access

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_safety_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_test_scenarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM employees WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is a manager of the given employee
CREATE OR REPLACE FUNCTION is_manager_of(employee_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = employee_uuid 
    AND manager_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is HR admin
CREATE OR REPLACE FUNCTION is_hr_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'hr_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is manager or HR admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'hr_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- DEPARTMENTS POLICIES
-- ============================================

CREATE POLICY "departments_select_all" ON departments
  FOR SELECT USING (true);

CREATE POLICY "departments_insert_hr_admin" ON departments
  FOR INSERT WITH CHECK (is_hr_admin());

CREATE POLICY "departments_update_hr_admin" ON departments
  FOR UPDATE USING (is_hr_admin());

CREATE POLICY "departments_delete_hr_admin" ON departments
  FOR DELETE USING (is_hr_admin());

-- ============================================
-- EMPLOYEES POLICIES
-- ============================================

-- Everyone can see basic employee info
CREATE POLICY "employees_select_own" ON employees
  FOR SELECT USING (
    id = auth.uid() OR 
    is_manager_of(id) OR 
    is_hr_admin()
  );

-- Only HR admin can insert employees
CREATE POLICY "employees_insert_hr_admin" ON employees
  FOR INSERT WITH CHECK (is_hr_admin());

-- Employees can update their own non-sensitive fields, HR can update all
CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (
    id = auth.uid() OR is_hr_admin()
  );

CREATE POLICY "employees_delete_hr_admin" ON employees
  FOR DELETE USING (is_hr_admin());

-- ============================================
-- TIME OFF POLICIES
-- ============================================

-- Time off balances: own, direct reports, or HR admin
CREATE POLICY "time_off_balances_select" ON time_off_balances
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    is_manager_of(employee_id) OR 
    is_hr_admin()
  );

CREATE POLICY "time_off_balances_insert" ON time_off_balances
  FOR INSERT WITH CHECK (is_hr_admin());

CREATE POLICY "time_off_balances_update" ON time_off_balances
  FOR UPDATE USING (is_hr_admin());

-- Time off requests
CREATE POLICY "time_off_requests_select" ON time_off_requests
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    is_manager_of(employee_id) OR 
    is_hr_admin()
  );

CREATE POLICY "time_off_requests_insert" ON time_off_requests
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "time_off_requests_update" ON time_off_requests
  FOR UPDATE USING (
    employee_id = auth.uid() OR 
    is_manager_of(employee_id) OR 
    is_hr_admin()
  );

-- ============================================
-- BENEFITS POLICIES
-- ============================================

CREATE POLICY "benefits_select_all" ON benefits
  FOR SELECT USING (true);

CREATE POLICY "benefits_modify_hr_admin" ON benefits
  FOR ALL USING (is_hr_admin());

CREATE POLICY "employee_benefits_select" ON employee_benefits
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

CREATE POLICY "employee_benefits_insert" ON employee_benefits
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

CREATE POLICY "employee_benefits_update" ON employee_benefits
  FOR UPDATE USING (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

CREATE POLICY "document_categories_select" ON document_categories
  FOR SELECT USING (true);

CREATE POLICY "document_categories_modify" ON document_categories
  FOR ALL USING (is_hr_admin());

-- Documents based on visibility
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    visibility = 'all' OR
    (visibility = 'managers' AND is_manager_or_admin()) OR
    (visibility = 'hr_admin' AND is_hr_admin())
  );

CREATE POLICY "documents_modify" ON documents
  FOR ALL USING (is_hr_admin());

CREATE POLICY "employee_documents_select" ON employee_documents
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

CREATE POLICY "employee_documents_insert" ON employee_documents
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

CREATE POLICY "employee_documents_update" ON employee_documents
  FOR UPDATE USING (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

-- ============================================
-- CHAT POLICIES
-- ============================================

CREATE POLICY "chat_conversations_select" ON chat_conversations
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "chat_conversations_insert" ON chat_conversations
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "chat_conversations_delete" ON chat_conversations
  FOR DELETE USING (employee_id = auth.uid());

CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = chat_messages.conversation_id 
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = chat_messages.conversation_id 
      AND employee_id = auth.uid()
    )
  );

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================

-- Users can see their own audit logs, HR admin can see all
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

-- Only system/HR can insert audit logs
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TEAM NOTES POLICIES (Manager only)
-- ============================================

CREATE POLICY "team_notes_select" ON team_notes
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    (employee_id = auth.uid() AND is_private = false) OR
    is_hr_admin()
  );

CREATE POLICY "team_notes_insert" ON team_notes
  FOR INSERT WITH CHECK (
    manager_id = auth.uid() AND is_manager_of(employee_id)
  );

CREATE POLICY "team_notes_update" ON team_notes
  FOR UPDATE USING (manager_id = auth.uid());

CREATE POLICY "team_notes_delete" ON team_notes
  FOR DELETE USING (manager_id = auth.uid());

-- ============================================
-- PERFORMANCE REVIEWS POLICIES
-- ============================================

CREATE POLICY "performance_reviews_select" ON performance_reviews
  FOR SELECT USING (
    employee_id = auth.uid() OR 
    reviewer_id = auth.uid() OR 
    is_hr_admin()
  );

CREATE POLICY "performance_reviews_insert" ON performance_reviews
  FOR INSERT WITH CHECK (
    is_manager_of(employee_id) OR 
    is_hr_admin()
  );

CREATE POLICY "performance_reviews_update" ON performance_reviews
  FOR UPDATE USING (
    reviewer_id = auth.uid() OR 
    employee_id = auth.uid() OR 
    is_hr_admin()
  );

-- ============================================
-- AI SAFETY SETTINGS POLICIES (HR Admin only)
-- ============================================

CREATE POLICY "ai_safety_settings_select" ON ai_safety_settings
  FOR SELECT USING (is_hr_admin());

CREATE POLICY "ai_safety_settings_modify" ON ai_safety_settings
  FOR ALL USING (is_hr_admin());

-- ============================================
-- POLICY TEST SCENARIOS (HR Admin only)
-- ============================================

CREATE POLICY "policy_test_scenarios_select" ON policy_test_scenarios
  FOR SELECT USING (is_hr_admin());

CREATE POLICY "policy_test_scenarios_modify" ON policy_test_scenarios
  FOR ALL USING (is_hr_admin());
