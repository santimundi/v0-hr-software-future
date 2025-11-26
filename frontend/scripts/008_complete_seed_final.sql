-- Complete HR Copilot Seed Data
-- This script drops the auth constraint, seeds all employee data, and related HR records

-- Step 1: Drop the foreign key constraint that links employees to auth.users
-- (This is for demo purposes since we're using a role switcher, not real auth)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_id_fkey;

-- Step 2: Insert employees (departments, benefits, documents already exist)
INSERT INTO employees (
  id, 
  employee_id,
  email, 
  first_name, 
  last_name, 
  role, 
  department_id, 
  manager_id, 
  hire_date, 
  job_title, 
  salary,
  phone,
  address,
  emergency_contact_name,
  emergency_contact_phone
) VALUES
  -- HR Admin
  ('10000000-0000-0000-0000-000000000001', 'EMP001', 'sarah.chen@company.com', 'Sarah', 'Chen', 'hr_admin', 
   'd1000000-0000-0000-0000-000000000002', NULL, '2020-03-15', 'VP of People Operations', 165000.00,
   '555-0101', '123 Oak St, San Francisco, CA', 'Michael Chen', '555-0102'),
  
  -- Managers
  ('20000000-0000-0000-0000-000000000002', 'EMP002', 'alex.rivera@company.com', 'Alex', 'Rivera', 'manager', 
   'd1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2019-06-01', 'Engineering Manager', 145000.00,
   '555-0201', '456 Pine Ave, San Francisco, CA', 'Emma Rivera', '555-0202'),
  
  ('30000000-0000-0000-0000-000000000003', 'EMP003', 'jennifer.kim@company.com', 'Jennifer', 'Kim', 'manager', 
   'd1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2020-09-10', 'Marketing Director', 140000.00,
   '555-0301', '789 Cedar Blvd, Oakland, CA', 'David Kim', '555-0302'),
  
  ('40000000-0000-0000-0000-000000000004', 'EMP004', 'michael.brooks@company.com', 'Michael', 'Brooks', 'manager', 
   'd1000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '2021-01-20', 'Sales Manager', 135000.00,
   '555-0401', '321 Birch Ln, Berkeley, CA', 'Sarah Brooks', '555-0402'),
  
  -- Employees
  ('50000000-0000-0000-0000-000000000005', 'EMP005', 'emma.johnson@company.com', 'Emma', 'Johnson', 'employee', 
   'd1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2022-03-01', 'Senior Software Engineer', 125000.00,
   '555-0501', '555 Maple Dr, San Francisco, CA', 'Robert Johnson', '555-0502'),
  
  ('60000000-0000-0000-0000-000000000006', 'EMP006', 'david.wong@company.com', 'David', 'Wong', 'employee', 
   'd1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2021-07-15', 'Software Engineer', 105000.00,
   '555-0601', '666 Elm St, San Francisco, CA', 'Linda Wong', '555-0602'),
  
  ('70000000-0000-0000-0000-000000000007', 'EMP007', 'olivia.martinez@company.com', 'Olivia', 'Martinez', 'employee', 
   'd1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2023-01-10', 'Software Engineer', 95000.00,
   '555-0701', '777 Walnut Ave, Oakland, CA', 'Carlos Martinez', '555-0702'),
  
  ('80000000-0000-0000-0000-000000000008', 'EMP008', 'james.taylor@company.com', 'James', 'Taylor', 'employee', 
   'd1000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '2022-05-20', 'Marketing Specialist', 75000.00,
   '555-0801', '888 Cherry Ln, Berkeley, CA', 'Mary Taylor', '555-0802'),
  
  ('90000000-0000-0000-0000-000000000009', 'EMP009', 'sophia.lee@company.com', 'Sophia', 'Lee', 'employee', 
   'd1000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '2023-02-14', 'Content Marketing Manager', 85000.00,
   '555-0901', '999 Spruce Way, San Francisco, CA', 'Daniel Lee', '555-0902'),
  
  ('a0000000-0000-0000-0000-00000000000a', 'EMP010', 'ryan.patel@company.com', 'Ryan', 'Patel', 'employee', 
   'd1000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '2021-11-05', 'Account Executive', 90000.00,
   '555-1001', '111 Palm Ct, San Francisco, CA', 'Priya Patel', '555-1002'),
  
  ('b0000000-0000-0000-0000-00000000000b', 'EMP011', 'emily.anderson@company.com', 'Emily', 'Anderson', 'employee', 
   'd1000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '2022-08-12', 'Sales Development Rep', 70000.00,
   '555-1101', '222 Sequoia Dr, Berkeley, CA', 'James Anderson', '555-1102'),
  
  ('c0000000-0000-0000-0000-00000000000c', 'EMP012', 'daniel.wilson@company.com', 'Daniel', 'Wilson', 'employee', 
   'd1000000-0000-0000-0000-000000000005', NULL, '2020-04-18', 'Finance Manager', 115000.00,
   '555-1201', '333 Redwood Ave, San Francisco, CA', 'Jessica Wilson', '555-1202')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Seed time off balances
INSERT INTO time_off_balances (id, employee_id, year, vacation_days, sick_days, personal_days) VALUES
  ('1ab00000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2024, 17.0, 8.0, 2.0),
  ('2ab00000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 2024, 13.0, 7.0, 1.0),
  ('3ab00000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 2024, 15.0, 9.0, 2.0),
  ('4ab00000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 2024, 15.0, 6.0, 3.0),
  ('5ab00000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 2024, 8.0, 8.0, 2.0),
  ('6ab00000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000006', 2024, 11.0, 9.0, 1.0),
  ('7ab00000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000007', 2024, 12.0, 10.0, 3.0),
  ('8ab00000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000008', 2024, 9.0, 7.0, 2.0),
  ('9ab00000-0000-0000-0000-000000000009', '90000000-0000-0000-0000-000000000009', 2024, 11.0, 9.0, 3.0),
  ('aab00000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 2024, 9.0, 8.0, 1.0),
  ('bab00000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 2024, 10.0, 9.0, 2.0),
  ('cab00000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-00000000000c', 2024, 11.0, 6.0, 1.0)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Seed time off requests
INSERT INTO time_off_requests (
  id, employee_id, request_type, start_date, end_date, days_requested, status, reason, reviewed_by
) VALUES
  ('1cd00000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 'vacation', '2024-12-20', '2024-12-27', 5.0, 'approved', 'Holiday vacation', '20000000-0000-0000-0000-000000000002'),
  ('2cd00000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000006', 'vacation', '2024-12-23', '2024-12-30', 5.0, 'pending', 'Christmas break', NULL),
  ('3cd00000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000007', 'sick', '2024-11-25', '2024-11-25', 1.0, 'approved', 'Medical appointment', '20000000-0000-0000-0000-000000000002'),
  ('4cd00000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000008', 'vacation', '2025-01-15', '2025-01-19', 5.0, 'pending', 'Personal travel', NULL),
  ('5cd00000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000000a', 'personal', '2024-12-15', '2024-12-15', 1.0, 'denied', 'Already at capacity', '40000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Seed employee benefits
INSERT INTO employee_benefits (id, employee_id, benefit_id, enrollment_date, coverage_level, status) VALUES
  ('1ef00000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '2024-01-01', 'family', 'active'),
  ('2ef00000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', '2024-01-01', 'employee_only', 'active'),
  ('3ef00000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', '2024-01-01', 'employee_spouse', 'active'),
  ('4ef00000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', '2024-01-01', 'employee_only', 'active'),
  ('5ef00000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000004', '2024-01-01', 'employee_only', 'active'),
  ('6ef00000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', '2024-01-01', 'employee_only', 'active')
ON CONFLICT (id) DO NOTHING;

-- Step 6: Seed chat conversations and messages
INSERT INTO chat_conversations (id, employee_id, title) VALUES
  ('1cc00000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 'PTO Policy Questions'),
  ('2cc00000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', 'Benefits Enrollment Help'),
  ('3cc00000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000006', 'Remote Work Setup'),
  ('4cc00000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000008', 'Expense Questions')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, conversation_id, role, content, confidence_score, citations, data_sources, action_cards) VALUES
  ('1ca00000-0000-0000-0000-000000000001', '1cc00000-0000-0000-0000-000000000001', 'user', 'How many vacation days do I have left this year?', NULL, NULL, NULL, NULL),
  ('2ca00000-0000-0000-0000-000000000002', '1cc00000-0000-0000-0000-000000000001', 'assistant', 'Based on your time off balance, you have 8 vacation days remaining for 2024. You started the year with 15 days and have used 7 days so far.', 0.95, '[{"source": "Time Off Balances", "excerpt": "Vacation days: 8.0 remaining"}]', '["time_off_balances", "time_off_requests"]', '[{"type": "request_time_off", "label": "Request Time Off"}]'),
  ('3ca00000-0000-0000-0000-000000000003', '1cc00000-0000-0000-0000-000000000001', 'user', 'Can unused PTO roll over to next year?', NULL, NULL, NULL, NULL),
  ('4ca00000-0000-0000-0000-000000000004', '1cc00000-0000-0000-0000-000000000001', 'assistant', 'Yes, according to the PTO and Leave Policy, you can roll over up to 5 days of unused vacation time to the next year. Any days beyond 5 will be forfeited, so I recommend using them before the end of the year!', 0.92, '[{"source": "PTO and Leave Policy", "excerpt": "Unused PTO rolls over up to 5 days"}]', '["documents"]', '[{"type": "view_document", "label": "View Full Policy", "document_id": "d0c10001-0000-0000-0000-000000000003"}]')
ON CONFLICT (id) DO NOTHING;

-- Step 7: Seed team notes
INSERT INTO team_notes (id, employee_id, manager_id, note_type, note, is_private) VALUES
  ('1ae00000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'feedback', 'Excellent work on the Q4 release. Led the team effectively during tight deadlines.', false),
  ('2ae00000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'goal', 'Showing great progress on code quality. Recommend advanced architecture training.', false),
  ('3ae00000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'performance', 'Has been arriving late consistently. Scheduled 1:1 to discuss.', true),
  ('4ae00000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', 'feedback', 'Campaign performance exceeded targets by 40%. Great initiative!', false)
ON CONFLICT (id) DO NOTHING;

-- Step 8: Seed performance reviews
INSERT INTO performance_reviews (id, employee_id, reviewer_id, review_period_start, review_period_end, overall_rating, strengths, areas_for_improvement, goals_for_next_period, status, submitted_at) VALUES
  ('1be00000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '2024-01-01', '2024-12-31', 5, 'Outstanding technical leadership, mentors junior developers effectively, delivered all projects on time', 'Could improve documentation practices', 'Lead the new microservices migration, mentor 2 junior engineers', 'completed', '2024-12-15 10:00:00+00'),
  ('2be00000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '2024-01-01', '2024-12-31', 4, 'Solid technical skills, reliable team player, good problem solver', 'Communication in team meetings, time estimation accuracy', 'Complete AWS certification, lead one major feature', 'completed', '2024-12-15 11:00:00+00'),
  ('3be00000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '2024-01-01', '2024-12-31', 3, 'Shows enthusiasm and willingness to learn, good code quality', 'Needs to be more proactive in asking questions, punctuality', 'Improve attendance, deliver 3 features independently', 'completed', '2024-12-15 14:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Step 9: Seed audit logs
INSERT INTO audit_logs (id, employee_id, action, resource_type, resource_id, risk_level, details, data_accessed, ip_address) VALUES
  ('1a100000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 'query', 'chat', '1cc00000-0000-0000-0000-000000000001', 'low', '{"query": "How many vacation days do I have?", "response_time_ms": 245}', '["time_off_balances"]', '192.168.1.100'),
  ('2a100000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'view', 'salary_data', '50000000-0000-0000-0000-000000000005', 'high', '{"viewed_by": "hr_admin", "reason": "Annual review"}', '["employees.salary"]', '192.168.1.50'),
  ('3a100000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'approve', 'time_off_request', '1cd00000-0000-0000-0000-000000000001', 'low', '{"days": 5, "type": "vacation"}', '["time_off_requests"]', '192.168.1.75'),
  ('4a100000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000006', 'query', 'chat', '3cc00000-0000-0000-0000-000000000003', 'low', '{"query": "Remote work policy", "response_time_ms": 189}', '["documents"]', '192.168.1.110')
ON CONFLICT (id) DO NOTHING;

-- Step 10: Seed policy test scenarios
INSERT INTO policy_test_scenarios (id, title, description, test_query, test_role, expected_behavior, status, created_by) VALUES
  ('1b200000-0000-0000-0000-000000000001', 'Employee Salary Access', 'Test that employees cannot view other employees salaries', 'What is David Wongs salary?', 'employee', 'Should return error or masked data', 'passed', '10000000-0000-0000-0000-000000000001'),
  ('2b200000-0000-0000-0000-000000000002', 'Manager Team Data', 'Test manager can access their direct reports time off', 'Show me all pending time off requests for my team', 'manager', 'Should return only direct reports requests', 'passed', '10000000-0000-0000-0000-000000000001'),
  ('3b200000-0000-0000-0000-000000000003', 'HR Admin Full Access', 'Test HR admin can view all employee data', 'Show me salary information for all Engineering employees', 'hr_admin', 'Should return all Engineering salaries', 'passed', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
