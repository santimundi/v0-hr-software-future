import { NextResponse } from "next/server"

interface EmployeeFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  department: string
  startDate: string
  salary: string
  contractType: "full-time" | "part-time" | "contract"
  manager: string
  additionalNotes: string
}

interface GeneratedDocument {
  name: string
  content: string
  type: "contract" | "offer-letter" | "nda" | "handbook" | "other"
}

// Mock LLM function - Replace this with actual LLM API call
async function generateDocumentWithLLM(documentType: string, employeeData: EmployeeFormData): Promise<string> {
  // This is a mock implementation. In production, you would call an actual LLM API
  // such as OpenAI, Anthropic, or your backend service
  
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  const employeeName = `${employeeData.firstName} ${employeeData.lastName}`
  
  switch (documentType) {
    case "contract":
      return `EMPLOYMENT CONTRACT

This Employment Contract ("Contract") is entered into on ${today} between ${employeeName} ("Employee") and [Company Name] ("Company").

1. POSITION AND DUTIES
   Employee shall serve as ${employeeData.jobTitle}${employeeData.department ? ` in the ${employeeData.department} department` : ""}.
   Employee agrees to perform all duties assigned by the Company in a professional and competent manner.

2. START DATE
   Employee's employment shall commence on ${new Date(employeeData.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

3. COMPENSATION
   ${employeeData.salary ? `Employee shall receive a base salary of ${employeeData.salary} per year, payable in accordance with the Company's standard payroll practices.` : "Compensation will be discussed separately."}

4. EMPLOYMENT TYPE
   This is a ${employeeData.contractType.replace("-", " ")} position.

5. MANAGER
   ${employeeData.manager ? `Employee will report directly to ${employeeData.manager}.` : "Reporting structure will be determined."}

6. CONFIDENTIALITY
   Employee agrees to maintain the confidentiality of all proprietary information and trade secrets of the Company.

7. TERMINATION
   Either party may terminate this agreement at any time with appropriate notice as per company policy.

${employeeData.additionalNotes ? `\nADDITIONAL NOTES:\n${employeeData.additionalNotes}` : ""}

By signing below, both parties agree to the terms and conditions outlined in this Contract.

_______________________          _______________________
Employee Signature                Company Representative

Date: _______________            Date: _______________
`

    case "offer-letter":
      return `OFFER OF EMPLOYMENT

${today}

Dear ${employeeData.firstName},

We are pleased to offer you the position of ${employeeData.jobTitle}${employeeData.department ? ` in our ${employeeData.department} department` : ""} at [Company Name].

POSITION DETAILS:
- Title: ${employeeData.jobTitle}
- Department: ${employeeData.department || "TBD"}
- Start Date: ${new Date(employeeData.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
- Employment Type: ${employeeData.contractType.replace("-", " ")}
${employeeData.salary ? `- Salary: ${employeeData.salary}` : ""}
${employeeData.manager ? `- Reporting Manager: ${employeeData.manager}` : ""}

We believe your skills and experience will be a valuable addition to our team. We look forward to welcoming you aboard.

This offer is contingent upon successful completion of background checks and reference verification.

Please confirm your acceptance of this offer by signing and returning this letter by [Date].

We are excited about the possibility of you joining our team.

Best regards,
[HR Department]
[Company Name]

${employeeData.additionalNotes ? `\nAdditional Information:\n${employeeData.additionalNotes}` : ""}
`

    case "nda":
      return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on ${today} between ${employeeName} ("Employee") and [Company Name] ("Company").

1. CONFIDENTIAL INFORMATION
   Employee acknowledges that during the course of employment, Employee may have access to confidential and proprietary information including, but not limited to:
   - Trade secrets
   - Customer lists and information
   - Financial data
   - Product development plans
   - Marketing strategies
   - Any other information marked as confidential

2. OBLIGATIONS
   Employee agrees to:
   a) Hold all Confidential Information in strict confidence
   b) Not disclose Confidential Information to any third party without prior written consent
   c) Use Confidential Information solely for the purpose of performing job duties
   d) Return all Confidential Information upon termination of employment

3. EXCEPTIONS
   This Agreement does not apply to information that:
   - Is publicly available
   - Was known to Employee prior to disclosure
   - Is independently developed by Employee
   - Is required to be disclosed by law

4. DURATION
   This Agreement shall remain in effect during employment and for [X] years following termination.

5. REMEDIES
   Employee acknowledges that breach of this Agreement may cause irreparable harm to the Company, and the Company may seek injunctive relief.

By signing below, Employee acknowledges understanding and agreement to the terms of this Agreement.

_______________________          _______________________
Employee Signature                Company Representative

Date: _______________            Date: _______________
`

    case "handbook":
      return `EMPLOYEE HANDBOOK ACKNOWLEDGMENT

${today}

Dear ${employeeData.firstName},

Welcome to [Company Name]! We are excited to have you join our team as ${employeeData.jobTitle}.

This handbook contains important information about our company policies, procedures, and benefits. Please review it carefully.

KEY INFORMATION:
- Position: ${employeeData.jobTitle}
- Department: ${employeeData.department || "TBD"}
- Start Date: ${new Date(employeeData.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
- Employment Type: ${employeeData.contractType.replace("-", " ")}

IMPORTANT POLICIES:
1. Code of Conduct: All employees are expected to maintain the highest standards of professional conduct.
2. Attendance: Regular attendance is essential for success in your role.
3. Confidentiality: All company information must be kept confidential.
4. Technology Use: Company equipment and systems are for business use only.
5. Time Off: PTO policies and procedures are outlined in the full handbook.

BENEFITS:
- Health Insurance
- Retirement Plans
- Paid Time Off
- Professional Development Opportunities

By signing below, you acknowledge that you have received, read, and understand the Employee Handbook and agree to comply with all company policies.

Please return this signed acknowledgment to HR by your start date.

_______________________          _______________________
Employee Signature                Date

${employeeData.additionalNotes ? `\nAdditional Notes:\n${employeeData.additionalNotes}` : ""}
`

    default:
      return `DOCUMENT FOR ${employeeName}

Position: ${employeeData.jobTitle}
Department: ${employeeData.department || "TBD"}
Start Date: ${new Date(employeeData.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
Employment Type: ${employeeData.contractType.replace("-", " ")}

${employeeData.additionalNotes || ""}
`
  }
}

export async function POST(request: Request) {
  try {
    const employeeData: EmployeeFormData = await request.json()

    // Validate required fields
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.email || !employeeData.jobTitle || !employeeData.startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate all necessary documents
    const documentTypes: Array<{ name: string; type: GeneratedDocument["type"] }> = [
      { name: `Employment Contract - ${employeeData.firstName} ${employeeData.lastName}`, type: "contract" },
      { name: `Offer Letter - ${employeeData.firstName} ${employeeData.lastName}`, type: "offer-letter" },
      { name: `NDA - ${employeeData.firstName} ${employeeData.lastName}`, type: "nda" },
      { name: `Employee Handbook Acknowledgment - ${employeeData.firstName} ${employeeData.lastName}`, type: "handbook" },
    ]

    const documents: GeneratedDocument[] = []

    for (const docType of documentTypes) {
      const content = await generateDocumentWithLLM(docType.type, employeeData)
      documents.push({
        name: docType.name,
        content,
        type: docType.type,
      })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error generating documents:", error)
    return NextResponse.json(
      { error: "Failed to generate documents" },
      { status: 500 }
    )
  }
}

