// Mock data for HR Copilot

export type UserRole = "employee" | "manager" | "hr-admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  location: string
  manager?: string
  managerId?: string
  avatar: string
  startDate: string
  contractType: string
  salary: number
  title: string
  skills: string[]
  directReports?: string[]
}

export interface Policy {
  id: string
  title: string
  version: string
  category: string
  lastUpdated: string
  content: string
  summary: string
}

export interface Document {
  id: string
  title: string
  type: string
  uploadDate: string
  tags: string[]
  userId: string
  aiSummary: string
  keyFields: Record<string, string>
}

export interface TimeOffRequest {
  id: string
  userId: string
  type: "annual" | "sick" | "personal" | "wfh"
  startDate: string
  endDate: string
  status: "draft" | "submitted" | "approved" | "rejected"
  reason: string
  createdAt: string
}

export interface AuditEvent {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  query: string
  sourcesAccessed: string[]
  citationsGenerated: string[]
  redactionsApplied: string[]
  decision: "allowed" | "blocked"
  riskFlags: string[]
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  pinned: boolean
  messages: Message[]
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  sources?: Source[]
  dataUsed?: string[]
  confidence?: "low" | "medium" | "high"
  actions?: ActionCard[]
}

export interface Source {
  type: "policy" | "document" | "hris" | "manager-notes"
  title: string
  version?: string
}

export interface ActionCard {
  id: string
  type: "leave-request" | "letter" | "summary" | "message"
  title: string
  description: string
}

export interface Benefit {
  id: string
  name: string
  type: string
  description: string
  eligibility: string
  coverage: string
  policyRef: string
}

// Mock Users
export const users: User[] = [
  {
    id: "EMP000001",
    name: "Layla Haddid",
    email: "layla.haddad@company.com",
    role: "hr-admin",
    department: "Human Resources",
    location: "New York",
    avatar: "/professional-hr-woman-avatar.jpg",
    startDate: "2019-01-10",
    contractType: "Full-time",
    salary: 145000,
    title: "HR Director",
    skills: ["HR Strategy", "Compliance", "Benefits Administration", "Employee Relations"],
  },
  {
    id: "EMP000002",
    name: "Alex Rivera",
    email: "alex.rivera@company.com",
    role: "manager",
    department: "Engineering",
    location: "San Francisco",
    manager: "Layla Haddid",
    managerId: "EMP000001",
    avatar: "/professional-man-avatar.png",
    startDate: "2020-06-01",
    contractType: "Full-time",
    salary: 175000,
    title: "Engineering Manager",
    skills: ["Leadership", "Agile", "System Design", "Team Building"],
    directReports: ["EMP000005"],
  },
  {
    id: "EMP000005",
    name: "Emma Johnson",
    email: "emma.johnson@company.com",
    role: "employee",
    department: "Engineering",
    location: "San Francisco",
    manager: "Alex Rivera",
    managerId: "EMP000002",
    avatar: "/professional-woman-avatar.png",
    startDate: "2022-03-15",
    contractType: "Full-time",
    salary: 125000,
    title: "Senior Software Engineer",
    skills: ["TypeScript", "React", "Node.js", "AWS"],
  },
]

// Mock Policies
export const policies: Policy[] = [
  {
    id: "pol-001",
    title: "Annual Leave Policy",
    version: "3.2",
    category: "Time Off",
    lastUpdated: "2024-01-15",
    content: `# Annual Leave Policy v3.2

## Entitlement
All full-time employees are entitled to 20 days of annual leave per calendar year. Part-time employees receive pro-rata entitlement.

## Accrual
Leave accrues at 1.67 days per month of service. New employees begin accruing from their start date.

## Carry Over
Up to 5 days of unused annual leave may be carried over to the following year. Carried over days must be used by March 31st.

## Request Process
1. Submit leave requests at least 2 weeks in advance
2. Manager approval required for all requests
3. HR Admin approval required for requests exceeding 10 consecutive days

## Blackout Periods
Leave requests during company-wide events or fiscal year-end may be subject to additional review.`,
    summary:
      "Employees receive 20 days annual leave, accruing monthly. Up to 5 days can carry over. Requests need 2 weeks notice and manager approval.",
  },
  {
    id: "pol-002",
    title: "Sick Leave Policy",
    version: "2.1",
    category: "Time Off",
    lastUpdated: "2024-02-01",
    content: `# Sick Leave Policy v2.1

## Entitlement
Employees are entitled to 10 days of sick leave per year. Unused sick leave does not carry over.

## Documentation
Medical certification is required for absences exceeding 3 consecutive days.

## Notification
Employees must notify their manager before their scheduled start time on the first day of absence.`,
    summary: "10 days sick leave per year. Medical certificate needed for 3+ days. Notify manager before shift starts.",
  },
  {
    id: "pol-003",
    title: "Work From Home Policy",
    version: "4.0",
    category: "Workplace",
    lastUpdated: "2024-03-01",
    content: `# Work From Home Policy v4.0

## Eligibility
All employees who have completed their probationary period are eligible for hybrid work arrangements.

## Schedule
Employees may work from home up to 3 days per week, with manager approval.

## Requirements
- Reliable internet connection
- Dedicated workspace
- Available during core hours (10am-4pm local time)
- Attend required in-person meetings`,
    summary:
      "Up to 3 WFH days per week after probation. Must have reliable internet and be available during core hours.",
  },
  {
    id: "pol-004",
    title: "Benefits Overview",
    version: "2.5",
    category: "Benefits",
    lastUpdated: "2024-01-01",
    content: `# Benefits Overview v2.5

## Health Insurance
Comprehensive medical, dental, and vision coverage for employees and dependents.

## Retirement
401(k) with 4% company match, vesting over 3 years.

## Wellness
$500 annual wellness stipend for gym memberships, fitness equipment, or wellness programs.`,
    summary: "Full health coverage, 401(k) with 4% match, $500 wellness stipend annually.",
  },
  {
    id: "pol-005",
    title: "Data Privacy Policy",
    version: "1.8",
    category: "Security",
    lastUpdated: "2024-02-15",
    content: `# Data Privacy Policy v1.8

## Personal Data
The company collects and processes personal data as necessary for employment purposes.

## Access Rights
Employees may request access to their personal data at any time.

## Data Security
All personal data is encrypted and stored in compliance with GDPR and CCPA regulations.`,
    summary: "Personal data processed for employment only. Employees can request their data. GDPR/CCPA compliant.",
  },
  {
    id: "pol-006",
    title: "Performance Review Policy",
    version: "3.0",
    category: "Performance",
    lastUpdated: "2024-01-20",
    content: `# Performance Review Policy v3.0

## Review Cycle
Annual performance reviews conducted in Q4, with mid-year check-ins in Q2.

## Components
- Self-assessment
- Manager assessment
- 360 feedback (optional)
- Goal setting for next period

## Ratings
Performance rated on 5-point scale: Exceptional, Exceeds, Meets, Developing, Below Expectations.`,
    summary: "Annual reviews in Q4 with Q2 check-ins. 5-point rating scale. Includes self and manager assessment.",
  },
]

// Mock Documents
export const documents: Document[] = [
  {
    id: "doc-001",
    title: "emma_johnson_employment_agreement",
    type: "Contract",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["contract", "legal"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: emma_johnson_employment_agreement",
    keyFields: {
      "File Name": "emma_johnson_employment_agreement.pdf",
      "File Size": "245.32 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-002",
    title: "health_insurance_details_northstar",
    type: "Policy",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["health", "insurance"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: health_insurance_details_northstar",
    keyFields: {
      "File Name": "health_insurance_details_northstar.pdf",
      "File Size": "189.45 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-003",
    title: "payslip_emma_johnson",
    type: "Payslip",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["payslip"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: payslip_emma_johnson",
    keyFields: {
      "File Name": "payslip_emma_johnson.pdf",
      "File Size": "156.78 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-004",
    title: "remote_work_policy",
    type: "Policy",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["policy"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: remote_work_policy",
    keyFields: {
      "File Name": "remote_work_policy.pdf",
      "File Size": "98.23 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-005",
    title: "pto_and_leave_policy",
    type: "Policy",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["policy"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: pto_and_leave_policy",
    keyFields: {
      "File Name": "pto_and_leave_policy.pdf",
      "File Size": "112.56 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-006",
    title: "benefits_enrollment_guide",
    type: "Benefits",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["benefits"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: benefits_enrollment_guide",
    keyFields: {
      "File Name": "benefits_enrollment_guide.pdf",
      "File Size": "203.89 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-007",
    title: "code_of_conduct",
    type: "Policy",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["policy"],
    userId: "EMP000005",
    aiSummary: "Uploaded policy document: code_of_conduct",
    keyFields: {
      "File Name": "code_of_conduct.pdf",
      "File Size": "167.34 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-008",
    title: "timesheet",
    type: "timesheet",
    uploadDate: "2024-11-29T18:20:00Z",
    tags: ["timesheet", "time-tracking"],
    userId: "EMP000005",
    aiSummary: "Uploaded timesheet document: timesheet",
    keyFields: {
      "File Name": "timesheet.xlsx",
      "File Size": "45.67 KB",
      "Upload Date": "November 29, 2024",
      "Upload Time": "06:20 PM",
    },
  },
  {
    id: "doc-009",
    title: "manager_1on1_templates",
    type: "Performance",
    uploadDate: "2025-12-01T23:03:00Z",
    tags: ["work"],
    userId: "EMP000002",
    aiSummary: "Uploaded performance document: manager_1on1_templates",
    keyFields: {
      "File Name": "manager_1on1_templates.pdf",
      "File Size": "156.23 KB",
      "Upload Date": "December 1, 2025",
      "Upload Time": "11:03 PM",
    },
  },
  {
    id: "doc-010",
    title: "incident_escalation_playbook",
    type: "Policy",
    uploadDate: "2025-12-01T23:02:00Z",
    tags: ["policy"],
    userId: "EMP000002",
    aiSummary: "Uploaded policy document: incident_escalation_playbook",
    keyFields: {
      "File Name": "incident_escalation_playbook.pdf",
      "File Size": "234.56 KB",
      "Upload Date": "December 1, 2025",
      "Upload Time": "11:02 PM",
    },
  },
  {
    id: "doc-011",
    title: "project_tracking_alex_rivera",
    type: "Performance",
    uploadDate: "2025-12-01T23:01:00Z",
    tags: ["projects"],
    userId: "EMP000002",
    aiSummary: "Uploaded performance document: project_tracking_alex_rivera",
    keyFields: {
      "File Name": "project_tracking_alex_rivera.xlsx",
      "File Size": "89.12 KB",
      "Upload Date": "December 1, 2025",
      "Upload Time": "11:01 PM",
    },
  },
  {
    id: "doc-012",
    title: "engineering_manager_handbook_alex_rivera",
    type: "Policy",
    uploadDate: "2025-12-01T23:01:00Z",
    tags: ["policy"],
    userId: "EMP000002",
    aiSummary: "Uploaded policy document: engineering_manager_handbook_alex_rivera",
    keyFields: {
      "File Name": "engineering_manager_handbook_alex_rivera.pdf",
      "File Size": "312.45 KB",
      "Upload Date": "December 1, 2025",
      "Upload Time": "11:01 PM",
    },
  },
  {
    id: "doc-013",
    title: "alex_rivera_payslip_2026_01",
    type: "Payslip",
    uploadDate: "2025-12-01T23:00:00Z",
    tags: ["payslip"],
    userId: "EMP000002",
    aiSummary: "Uploaded payslip document: alex_rivera_payslip_2026_01",
    keyFields: {
      "File Name": "alex_rivera_payslip_2026_01.pdf",
      "File Size": "178.34 KB",
      "Upload Date": "December 1, 2025",
      "Upload Time": "11:00 PM",
    },
  },
]

// Mock Time Off Requests
export const timeOffRequests: TimeOffRequest[] = [
  {
    id: "pto-001",
    userId: "EMP000005",
    type: "annual",
    startDate: "2024-12-23",
    endDate: "2024-12-27",
    status: "approved",
    reason: "Holiday vacation with family",
    createdAt: "2024-11-15",
  },
  {
    id: "pto-002",
    userId: "EMP000005",
    type: "sick",
    startDate: "2024-11-05",
    endDate: "2024-11-05",
    status: "approved",
    reason: "Feeling unwell",
    createdAt: "2024-11-05",
  },
  {
    id: "pto-003",
    userId: "EMP000005",
    type: "annual",
    startDate: "2025-01-20",
    endDate: "2025-01-24",
    status: "submitted",
    reason: "Personal trip",
    createdAt: "2024-11-20",
  },
]

// Mock Audit Events
export const auditEvents: AuditEvent[] = [
  {
    id: "audit-001",
    userId: "EMP000005",
    userName: "Emma Johnson",
    userRole: "employee",
    action: "query",
    query: "How many vacation days do I have left?",
    sourcesAccessed: ["HRIS: Time off balance", "Policy: Annual Leave v3.2"],
    citationsGenerated: ["Annual Leave Policy v3.2 - Section 2.1"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-20T10:30:00Z",
  },
  {
    id: "audit-002",
    userId: "EMP000005",
    userName: "Emma Johnson",
    userRole: "employee",
    action: "query",
    query: "What is my manager's salary?",
    sourcesAccessed: [],
    citationsGenerated: [],
    redactionsApplied: ["salary_data"],
    decision: "blocked",
    riskFlags: ["unauthorized_access_attempt"],
    timestamp: "2024-11-19T14:22:00Z",
  },
  {
    id: "audit-003",
    userId: "EMP000002",
    userName: "Alex Rivera",
    userRole: "manager",
    action: "query",
    query: "Show team PTO for December",
    sourcesAccessed: ["HRIS: Team time off", "Org: Direct reports"],
    citationsGenerated: ["Team Calendar Data"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-18T09:15:00Z",
  },
  {
    id: "audit-004",
    userId: "EMP000001",
    userName: "Layla Haddid",
    userRole: "hr-admin",
    action: "document_generation",
    query: "Generate employment verification letter for Sarah Chen",
    sourcesAccessed: ["HRIS: Employee profile", "Document: Employment Contract"],
    citationsGenerated: ["Employment Contract - Start Date", "HRIS: Current Position"],
    redactionsApplied: ["salary_amount"],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-17T16:45:00Z",
  },
  {
    id: "audit-005",
    userId: "EMP000002",
    userName: "Alex Rivera",
    userRole: "manager",
    action: "approval",
    query: "Approve PTO request for Emma Johnson",
    sourcesAccessed: ["HRIS: Time off request", "Policy: Annual Leave v3.2"],
    citationsGenerated: ["Request ID: PTO-001"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-16T11:30:00Z",
  },
  {
    id: "audit-006",
    userId: "EMP000001",
    userName: "Layla Haddid",
    userRole: "hr-admin",
    action: "policy_update",
    query: "Update Annual Leave Policy to v3.2",
    sourcesAccessed: ["Policy: Annual Leave v3.1"],
    citationsGenerated: ["Policy diff: v3.1 → v3.2"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-15T13:00:00Z",
  },
  {
    id: "audit-007",
    userId: "EMP000005",
    userName: "Emma Johnson",
    userRole: "employee",
    action: "query",
    query: "Summarize my performance review",
    sourcesAccessed: ["Document: Performance Review 2023"],
    citationsGenerated: ["Performance Review 2023 - Summary Section"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: [],
    timestamp: "2024-11-14T10:00:00Z",
  },
  {
    id: "audit-008",
    userId: "EMP000001",
    userName: "Layla Haddid",
    userRole: "hr-admin",
    action: "bulk_export",
    query: "Export all employee time off balances",
    sourcesAccessed: ["HRIS: All employee time off"],
    citationsGenerated: ["Bulk export: 150 records"],
    redactionsApplied: [],
    decision: "allowed",
    riskFlags: ["bulk_data_access"],
    timestamp: "2024-11-13T15:20:00Z",
  },
]

// Mock Benefits
export const benefits: Benefit[] = [
  {
    id: "ben-001",
    name: "Medical Insurance",
    type: "Health",
    description:
      "Comprehensive medical coverage including preventive care, hospitalization, prescriptions, and specialist visits.",
    eligibility: "All full-time employees from day 1",
    coverage: "Employee + Dependents",
    policyRef: "Benefits Overview v2.5 - Section 1",
  },
  {
    id: "ben-002",
    name: "Dental Insurance",
    type: "Health",
    description: "Coverage for routine dental care, cleanings, fillings, and major dental work.",
    eligibility: "All full-time employees from day 1",
    coverage: "Employee + Dependents",
    policyRef: "Benefits Overview v2.5 - Section 1",
  },
  {
    id: "ben-003",
    name: "Vision Insurance",
    type: "Health",
    description: "Annual eye exams, glasses or contact lens allowance, and discounts on LASIK.",
    eligibility: "All full-time employees from day 1",
    coverage: "Employee + Dependents",
    policyRef: "Benefits Overview v2.5 - Section 1",
  },
  {
    id: "ben-004",
    name: "401(k) Retirement Plan",
    type: "Retirement",
    description: "Tax-advantaged retirement savings with company matching up to 4% of salary.",
    eligibility: "All employees after 30 days",
    coverage: "Employee only",
    policyRef: "Benefits Overview v2.5 - Section 2",
  },
  {
    id: "ben-005",
    name: "Wellness Stipend",
    type: "Wellness",
    description: "$500 annual allowance for gym memberships, fitness equipment, wellness apps, or health programs.",
    eligibility: "All full-time employees",
    coverage: "Employee only",
    policyRef: "Benefits Overview v2.5 - Section 3",
  },
]

// Mock Conversations
export const conversations: Conversation[] = [
  {
    id: "conv-001",
    title: "Vacation days inquiry",
    lastMessage: "You have 12 days remaining...",
    timestamp: "2024-11-20T10:30:00Z",
    pinned: true,
    messages: [
      {
        id: "msg-001",
        role: "user",
        content: "How many vacation days do I have left and can I take 5 days in December?",
        timestamp: "2024-11-20T10:28:00Z",
      },
      {
        id: "msg-002",
        role: "assistant",
        content:
          "Based on your HRIS records, you have **12 days** of annual leave remaining for 2024.\n\nYes, you can request 5 days in December. According to our Annual Leave Policy, requests should be submitted at least 2 weeks in advance and require manager approval.\n\n**Recommendation:** I notice December 23-27 falls during the holiday period. This is a popular time for leave requests, so I recommend submitting your request soon to ensure availability.",
        timestamp: "2024-11-20T10:30:00Z",
        sources: [
          { type: "hris", title: "Time off balance" },
          { type: "policy", title: "Annual Leave Policy", version: "3.2" },
        ],
        dataUsed: ["HRIS", "Policy"],
        confidence: "high",
        actions: [
          {
            id: "action-001",
            type: "leave-request",
            title: "Create leave request",
            description: "Start a new time off request for December",
          },
        ],
      },
    ],
  },
  {
    id: "conv-002",
    title: "Performance review summary",
    lastMessage: "Your 2023 review highlights...",
    timestamp: "2024-11-19T14:00:00Z",
    pinned: false,
    messages: [
      {
        id: "msg-003",
        role: "user",
        content: "Can you summarize my last performance review and suggest 3 growth goals?",
        timestamp: "2024-11-19T13:58:00Z",
      },
      {
        id: "msg-004",
        role: "assistant",
        content:
          "## Your 2023 Performance Review Summary\n\n**Overall Rating:** Exceeds Expectations\n\n**Key Strengths:**\n- Strong technical expertise in TypeScript and React\n- Excellent collaboration with cross-functional teams\n- Consistently delivers high-quality code on time\n\n**Development Areas:**\n- Public speaking and presentation skills\n- Strategic thinking and long-term planning\n\n---\n\n## Suggested Growth Goals for 2024\n\n1. **Lead a Tech Talk** - Present at a team or company-wide engineering session to build public speaking confidence\n\n2. **Mentor a Junior Developer** - Take on a mentorship role to develop leadership skills\n\n3. **Complete System Design Training** - Enhance strategic thinking through architecture courses",
        timestamp: "2024-11-19T14:00:00Z",
        sources: [
          { type: "document", title: "Performance Review 2023" },
          { type: "policy", title: "Performance Review Policy", version: "3.0" },
        ],
        dataUsed: ["Document", "Policy"],
        confidence: "high",
        actions: [
          {
            id: "action-002",
            type: "summary",
            title: "Save to profile",
            description: "Add these goals to your profile",
          },
        ],
      },
    ],
  },
]

// HRIS Data
export const hrisData: Record<string, {
  timeOffBalance: {
    annual: number;
    sick: number;
    personal: number;
  };
  tenure: string;
  nextReview: string;
  lastRaise: string;
  performanceRating: string;
}> = {
  "EMP000001": {
    timeOffBalance: {
      annual: 20,
      sick: 10,
      personal: 5,
    },
    tenure: "5 years, 10 months",
    nextReview: "2025-01-10",
    lastRaise: "2024-01-01",
    performanceRating: "Exceeds Expectations",
  },
  "EMP000002": {
    timeOffBalance: {
      annual: 18,
      sick: 10,
      personal: 3,
    },
    tenure: "4 years, 5 months",
    nextReview: "2025-06-01",
    lastRaise: "2024-06-01",
    performanceRating: "Exceeds Expectations",
  },
  "EMP000005": {
    timeOffBalance: {
      annual: 12,
      sick: 8,
      personal: 2,
    },
    tenure: "2 years, 8 months",
    nextReview: "2024-12-15",
    lastRaise: "2024-03-01",
    performanceRating: "Exceeds Expectations",
  },
}

// Helper functions
export function getUserByRole(role: UserRole): User {
  return users.find((u) => u.role === role) || users[0]
}

export function getDocumentsForUser(userId: string): Document[] {
  return documents.filter((d) => d.userId === userId)
}

export function getTimeOffRequestsForUser(userId: string): TimeOffRequest[] {
  return timeOffRequests.filter((r) => r.userId === userId)
}

export function getPoliciesByCategory(category: string): Policy[] {
  return policies.filter((p) => p.category === category)
}
