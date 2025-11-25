-- Seed data for HR Copilot
-- This script populates the database with sample data for testing

-- ============================================
-- DEPARTMENTS
-- ============================================

INSERT INTO departments (id, name, description) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Engineering', 'Software development and technical operations'),
  ('d1000000-0000-0000-0000-000000000002', 'Human Resources', 'People operations and employee relations'),
  ('d1000000-0000-0000-0000-000000000003', 'Marketing', 'Brand management and growth'),
  ('d1000000-0000-0000-0000-000000000004', 'Sales', 'Revenue generation and client relations'),
  ('d1000000-0000-0000-0000-000000000005', 'Finance', 'Financial planning and accounting'),
  ('d1000000-0000-0000-0000-000000000006', 'Product', 'Product strategy and management')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DOCUMENT CATEGORIES
-- ============================================

INSERT INTO document_categories (id, name, description, icon) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Company Policies', 'Official company policies and guidelines', 'FileText'),
  ('c1000000-0000-0000-0000-000000000002', 'Benefits', 'Benefits documentation and enrollment forms', 'Heart'),
  ('c1000000-0000-0000-0000-000000000003', 'Onboarding', 'New employee onboarding materials', 'UserPlus'),
  ('c1000000-0000-0000-0000-000000000004', 'Training', 'Training materials and certifications', 'GraduationCap'),
  ('c1000000-0000-0000-0000-000000000005', 'Legal & Compliance', 'Legal documents and compliance materials', 'Scale'),
  ('c1000000-0000-0000-0000-000000000006', 'Performance', 'Performance review templates and guides', 'TrendingUp')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- BENEFITS
-- ============================================

INSERT INTO benefits (id, name, type, provider, description, monthly_cost_employee, monthly_cost_employer, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Medical PPO', 'medical', 'Blue Cross Blue Shield', 'Comprehensive medical coverage with PPO network', 250.00, 750.00, true),
  ('b1000000-0000-0000-0000-000000000002', 'Medical HMO', 'medical', 'Kaiser Permanente', 'HMO medical plan with lower premiums', 150.00, 600.00, true),
  ('b1000000-0000-0000-0000-000000000003', 'Dental Plus', 'dental', 'Delta Dental', 'Comprehensive dental coverage including orthodontics', 45.00, 55.00, true),
  ('b1000000-0000-0000-0000-000000000004', 'Vision Care', 'vision', 'VSP', 'Vision coverage including frames and contacts', 15.00, 25.00, true),
  ('b1000000-0000-0000-0000-000000000005', 'Life Insurance', 'life', 'MetLife', 'Term life insurance - 2x annual salary', 0.00, 50.00, true),
  ('b1000000-0000-0000-0000-000000000006', '401(k) Plan', '401k', 'Fidelity', '401(k) retirement plan with 4% company match', 0.00, 0.00, true),
  ('b1000000-0000-0000-0000-000000000007', 'HSA', 'hsa', 'HealthEquity', 'Health Savings Account for medical expenses', 0.00, 100.00, true),
  ('b1000000-0000-0000-0000-000000000008', 'FSA', 'fsa', 'WageWorks', 'Flexible Spending Account for healthcare/dependent care', 0.00, 0.00, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- DOCUMENTS / POLICIES
-- ============================================

INSERT INTO documents (id, title, category_id, content, version, is_policy, visibility, ai_summary, effective_date) VALUES
  ('d0c10000-0000-0000-0000-000000000001', 'Employee Handbook 2024', 'c1000000-0000-0000-0000-000000000001', 
   'This handbook outlines company policies, expectations, and benefits...', '3.2', true, 'all',
   'Comprehensive guide covering workplace conduct, benefits, time off policies, and company values. Key sections include PTO accrual (15 days/year for new hires), remote work policy (hybrid model), and performance review cycles (quarterly).',
   '2024-01-01'),
  
  ('d0c10000-0000-0000-0000-000000000002', 'Remote Work Policy', 'c1000000-0000-0000-0000-000000000001',
   'Guidelines for remote and hybrid work arrangements...', '2.0', true, 'all',
   'Defines hybrid work model: 3 days in office, 2 days remote. Covers equipment stipend ($500/year), home office requirements, and communication expectations during remote days.',
   '2024-03-15'),
  
  ('d0c10000-0000-0000-0000-000000000003', 'PTO and Leave Policy', 'c1000000-0000-0000-0000-000000000001',
   'Paid time off accrual and leave request procedures...', '1.5', true, 'all',
   'PTO: 15 days (0-2 years), 20 days (3-5 years), 25 days (5+ years). Sick leave: 10 days/year. Personal days: 3/year. Requests require manager approval 2 weeks in advance for vacation.',
   '2024-01-01'),
  
  ('d0c10000-0000-0000-0000-000000000004', 'Benefits Enrollment Guide', 'c1000000-0000-0000-0000-000000000002',
   'How to enroll in company benefits...', '1.0', false, 'all',
   'Step-by-step guide for benefits enrollment during open enrollment (November) or qualifying life events. Covers medical, dental, vision, 401(k), and supplemental options.',
   '2024-01-01'),
  
  ('d0c10000-0000-0000-0000-000000000005', 'Code of Conduct', 'c1000000-0000-0000-0000-000000000001',
   'Professional conduct expectations and ethics guidelines...', '2.1', true, 'all',
   'Establishes standards for professional behavior, conflicts of interest, confidentiality, and reporting concerns. Includes anti-harassment policy and whistleblower protections.',
   '2024-01-01'),
  
  ('d0c10000-0000-0000-0000-000000000006', 'Manager Guidelines', 'c1000000-0000-0000-0000-000000000001',
   'Guidelines for people managers...', '1.3', true, 'managers',
   'Manager responsibilities including 1:1 meetings (weekly recommended), performance feedback, team development, and handling sensitive employee situations.',
   '2024-02-01'),
  
  ('d0c10000-0000-0000-0000-000000000007', 'Compensation Philosophy', 'c1000000-0000-0000-0000-000000000001',
   'Company approach to compensation and equity...', '1.0', true, 'hr_admin',
   'Internal document outlining salary bands, equity refresh grants, promotion criteria, and annual compensation review process. Includes market data sources and pay equity commitment.',
   '2024-01-15'),
  
  ('d0c10000-0000-0000-0000-000000000008', 'New Hire Checklist', 'c1000000-0000-0000-0000-000000000003',
   'Onboarding checklist for new employees...', '1.2', false, 'all',
   'Week 1-4 onboarding tasks including IT setup, benefits enrollment, required training completion, and team introductions.',
   '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================
-- AI SAFETY SETTINGS (Default Configuration)
-- ============================================

INSERT INTO ai_safety_settings (setting_key, setting_value, description) VALUES
  ('pii_masking', '{"enabled": true, "mask_ssn": true, "mask_salary": true, "mask_address": true}', 'Controls masking of personally identifiable information'),
  ('salary_protection', '{"enabled": true, "visible_to_roles": ["hr_admin"], "aggregate_only_for_managers": true}', 'Controls who can see salary information'),
  ('data_retention', '{"chat_history_days": 90, "audit_log_days": 365}', 'Data retention policies for AI interactions'),
  ('confidence_threshold', '{"minimum_display": 0.7, "require_human_review_below": 0.5}', 'Confidence thresholds for AI responses'),
  ('allowed_topics', '{"employee": ["policies", "benefits", "time_off", "general_hr"], "manager": ["team_management", "performance", "hiring"], "hr_admin": ["all"]}', 'Topics allowed by role')
ON CONFLICT (setting_key) DO NOTHING;
