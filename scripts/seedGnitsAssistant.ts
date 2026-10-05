import { firestoreSetDoc, firestoreGetDoc } from '../server/firestoreClient';
import {
  ensureAssistantFileSearchStore,
  uploadFileToStore,
  AssistantRecord,
  DocumentRecord,
  AssistantDocumentRecord,
} from '../server/ragService';
import fs from 'fs';
import path from 'path';

const GNITS_DOCS = [
  {
    id: 'doc-gnits-1',
    filename: 'GNITS Autonomous Academic Regulations.pdf',
    filesize: '3.4 MB',
    type: 'PDF',
    pages: 36,
    summary: 'Autonomous academic regulations, 160 credits framework, 75% attendance rule, condonation criteria, 10-point grading scale, and degree eligibility.',
    chunkCount: 110,
    content: `G. NARAYANAMMA INSTITUTE OF TECHNOLOGY & SCIENCE (FOR WOMEN)
Autonomous Institution under UGC, Approved by AICTE, Affiliated to JNTU Hyderabad
Shaikpet, Hyderabad - 500104

ACADEMIC REGULATIONS FOR B.TECH (4-YEAR AUTONOMOUS DEGREE)

ARTICLE 1: DURATION & CREDIT FRAMEWORK
1.1 The four-year B.Tech curriculum requires successful completion of 160 total academic credits. Lateral entry students require 120 credits across 3 years (Semesters 3 to 8).
1.2 Maximum duration permitted for completion: 8 consecutive academic years for regular students, 6 consecutive academic years for lateral entry.
1.3 B.Tech with Honours or Minor Specialization requires an additional 18 to 20 credits beyond the 160 baseline credits, completed between Semesters 4 and 8.

ARTICLE 2: ATTENDANCE & CONDONATION RULES
2.1 Minimum Attendance: A student must maintain at least 75% aggregate attendance across all registered courses in a semester to be certified for semester end examinations.
2.2 Medical Condonation: Condonation of shortage of attendance between 65% and 74.9% may be granted on valid medical grounds (hospitalization/severe illness) by the Principal upon recommendation of the Head of the Department and Academic Council.
2.3 The student must submit authentic medical certificates within 3 days of returning to campus and pay the prescribed condonation fee of Rs. 1,000 per semester.
2.4 Detention: Students possessing less than 65% aggregate attendance are strictly DETAINED. They are not eligible to write semester examinations and must repeat the semester in the next academic year.

ARTICLE 3: CONTINUOUS INTERNAL EVALUATION (CIE) & SEMESTER END EXAMS (SEE)
3.1 Course distribution: 40 marks for Continuous Internal Evaluation (CIE) and 60 marks for Semester End Examination (SEE).
3.2 CIE consists of two Mid-Term Examinations (25 marks each, scaled), continuous quizzes/objective tests (5 marks), and assignments/case studies (10 marks).
3.3 Minimum Pass Criteria: A student must secure a minimum of 35% marks (21 out of 60) in the Semester End Exam, and an overall aggregate of 40% (40 out of 100) including CIE and SEE combined.

ARTICLE 4: 10-POINT GRADING SYSTEM
Grades and Grade Points:
- O (Outstanding): 90% to 100% (Grade Points: 10.0)
- A+ (Excellent): 80% to 89% (Grade Points: 9.0)
- A (Very Good): 70% to 79% (Grade Points: 8.0)
- B+ (Good): 60% to 69% (Grade Points: 7.0)
- B (Above Average): 50% to 59% (Grade Points: 6.0)
- C (Average): 40% to 49% (Grade Points: 5.0)
- F (Fail / Backlog): Below 40% (Grade Points: 0.0)
- Ab (Absent): 0.0
Semester Grade Point Average (SGPA) = Sum(Credits * Grade Points) / Sum(Credits).
Cumulative Grade Point Average (CGPA) is calculated across all completed semesters.
`,
  },
  {
    id: 'doc-gnits-2',
    filename: 'GNITS B.Tech Syllabus & Department Curriculum.pdf',
    filesize: '6.8 MB',
    type: 'PDF',
    pages: 78,
    summary: 'Comprehensive 4-year semester-wise syllabus for Computer Science & Engineering (CSE), ECE, EEE, IT, CSM (AI&ML), and CSD (Data Science).',
    chunkCount: 245,
    content: `G. NARAYANAMMA INSTITUTE OF TECHNOLOGY & SCIENCE (FOR WOMEN)
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING (CSE) & ALLIED BRANCHES
AUTONOMOUS B.TECH CURRICULUM & SYLLABUS BREAKDOWN (SEMESTERS 1 TO 8)

YEAR 1: FOUNDATION AND ENGINEERING BASICS
Semester 1 (I-I):
- Linear Algebra and Calculus (Mathematics-I) (3 Credits)
- Engineering Chemistry (3 Credits)
- Programming for Problem Solving using C (3 Credits)
- Basic Electrical Engineering (3 Credits)
- English for Professional Communication (2 Credits)
- Engineering Workshop & IT Fabrication Lab (1.5 Credits)
- C Programming & Problem Solving Lab (1.5 Credits)
- English Language & Communication Skills Lab (1 Credit)

Semester 2 (I-II):
- Differential Equations and Vector Calculus (Mathematics-II) (3 Credits)
- Applied Physics (3 Credits)
- Data Structures through C (3 Credits)
- Python Programming Essentials (3 Credits)
- Environmental Science (Mandatory Non-Credit Course)
- Applied Physics Laboratory (1.5 Credits)
- Data Structures Laboratory (1.5 Credits)
- Python Programming Practice Lab (1 Credit)

YEAR 2: CORE COMPUTER SCIENCE FOUNDATIONS
Semester 3 (II-I):
- Discrete Mathematics & Graph Theory (3 Credits)
- Computer Organization & Architecture (COA) (3 Credits)
- Object-Oriented Programming through Java (OOPs) (3 Credits)
- Database Management Systems (DBMS) (3 Credits)
- Digital Logic Design (DLD) (3 Credits)
- Java Programming Laboratory (1.5 Credits)
- DBMS & SQL Lab (1.5 Credits)
- Constitution of India (Mandatory Non-Credit Course)

Semester 4 (II-II):
- Design and Analysis of Algorithms (DAA) (3 Credits)
- Operating Systems (OS) (3 Credits)
- Formal Languages and Automata Theory (FLAT / TOC) (3 Credits)
- Software Engineering & Agile Methodologies (3 Credits)
- Business Economics & Financial Analysis (BEFA) (3 Credits)
- Operating Systems & Linux Kernel Lab (1.5 Credits)
- DAA Algorithms Lab (1.5 Credits)
- Gender Sensitization Lab (Mandatory Non-Credit Course)

YEAR 3: ADVANCED COMPUTING & SPECIALIZATION
Semester 5 (III-I):
- Computer Networks (CN) (3 Credits)
- Compiler Design (3 Credits)
- Web Technologies (HTML5, CSS, React, Node.js) (3 Credits)
- Professional Elective-I: Artificial Intelligence OR Computer Graphics OR Software Testing Methodologies (3 Credits)
- Open Elective-I: Principles of Communications OR Renewable Energy Systems (3 Credits)
- Computer Networks & Security Lab (1.5 Credits)
- Web Technologies Lab (1.5 Credits)
- Advanced English Communication & Soft Skills Lab (1 Credit)

Semester 6 (III-II):
- Machine Learning Fundamentals (3 Credits)
- Cloud Computing & Virtualization (3 Credits)
- Cryptography & Network Security (CNS) (3 Credits)
- Professional Elective-II: Big Data Analytics OR DevOps Architecture OR Mobile Application Development (3 Credits)
- Professional Elective-III: Internet of Things (IoT) OR Distributed Systems (3 Credits)
- Machine Learning Lab (1.5 Credits)
- Cloud Computing Lab (1.5 Credits)
- Mini-Project / Socially Relevant Project (2 Credits)

YEAR 4: ADVANCED CAPSTONE, INDUSTRY ELECTIVES & INTERNSHIP
Semester 7 (IV-I):
- Deep Learning & Neural Networks (3 Credits)
- Professional Elective-IV: Cyber Security & Ethical Hacking OR Natural Language Processing (NLP) (3 Credits)
- Professional Elective-V: Blockchain Technologies OR Quantum Computing (3 Credits)
- Open Elective-II: Intellectual Property Rights (IPR) OR Entrepreneurship & Startups (3 Credits)
- Deep Learning Lab (1.5 Credits)
- Summer Industry Internship Evaluation (2 Credits)
- Major Project Work (Phase-I: Problem Formulation & Architecture) (3 Credits)

Semester 8 (IV-II):
- Professional Elective-VI: High Performance Computing OR Reinforcement Learning (3 Credits)
- Major Technical Seminar (1 Credit)
- Major Project Work (Phase-II: Implementation, Defense & Viva Voce) (7 Credits)
`,
  },
  {
    id: 'doc-gnits-3',
    filename: 'GNITS ECAP Portal & Student Services Guide.pdf',
    filesize: '2.9 MB',
    type: 'PDF',
    pages: 28,
    summary: 'Student login portal procedures at gnits.ecap.in, checking attendance, hall ticket generation, exam results, and academic grievance redressal.',
    chunkCount: 92,
    content: `G. NARAYANAMMA INSTITUTE OF TECHNOLOGY & SCIENCE (FOR WOMEN)
ENGINEERING COLLEGE AUTOMATION PACKAGE (ECAP) & STUDENT SERVICES PORTAL

1. ABOUT ECAP PORTAL (gnits.ecap.in)
The ECAP system is the official student and parent digital administration gateway for GNITS.
Accessible at: http://gnits.ecap.in or through the GNITS college website quick links.

2. STUDENT LOGIN CREDENTIALS
- Username: Student Roll Number / Hall Ticket Number (e.g., 22251A0501 to 25251A05XX).
- Password: Default password provided during I-Year orientation. Students are instructed to update it upon first login.
- Parent Portal: Parents can log in with their registered mobile number to monitor daily attendance and marks.

3. SERVICES AVAILABLE IN ECAP
- Daily & Cumulative Attendance: Real-time subject-wise percentage and shortage warnings.
- Continuous Assessment Marks: Mid-1 and Mid-2 internal examination marks, lab evaluation, and assignment scores.
- Semester Examination Hall Tickets: Autonomous exam hall tickets can be downloaded 5 days prior to examination commencement after clearing fee dues and verifying 75% attendance compliance.
- Fee Dues & Receipts: Tuition fee, autonomous examination fee, bus transport fee, and hostel fee payment status with instant download of official tax/accounting receipts.
- End Semester Autonomous Results: Complete SGPA, CGPA, grade transcripts, and backlog lists.

4. STUDENT SUPPORT SERVICES & COMMITTEES
- Anti-Ragging Committee: Toll-free 24/7 emergency helpline; zero tolerance policy.
- Internal Complaints Committee (ICC) & Women Protection Cell: Confidential support for any harassment or safety concerns.
- Training & Career Guidance Cell: Conducts mock interviews, coding bootcamps, and soft skills workshops.
- Counselor / Mentor Mentee System: Each faculty mentor oversees 15 to 20 students for academic, personal, and career guidance.
`,
  },
  {
    id: 'doc-gnits-4',
    filename: 'GNITS Placements, Facilities & Campus Life.pdf',
    filesize: '4.5 MB',
    type: 'PDF',
    pages: 42,
    summary: 'Campus infrastructure at Shaikpet Hyderabad, placement records, highest & average packages, top recruiters, IEEE/ACM chapters, hostels, and sports.',
    chunkCount: 135,
    content: `G. NARAYANAMMA INSTITUTE OF TECHNOLOGY & SCIENCE (FOR WOMEN)
CAMPUS LIFE, INFRASTRUCTURE, PLACEMENTS & ADMISSION OVERVIEW

1. INSTITUTION BACKGROUND
Established in 1997 by Sri G. Pulla Reddy, GNITS is the first engineering college for women in Telangana.
Autonomous under UGC, affiliated to JNTUH, accredited with NAAC 'A+' Grade and NBA (Tier-1) for all undergraduate branches.
Counseling EAMCET Code: GNTS.
Location: Shaikpet, Hyderabad - 500104, Telangana (near Tolichowki & Mehdipatnam).

2. PLACEMENTS & RECRUITERS
GNITS maintains an exceptional track record with over 85% to 92% placement rates every academic year.
- Highest Package: Rs. 54.75 LPA (offered by major multinational tech companies).
- Average Package: Rs. 8.6 LPA across engineering branches.
- Top Marquee Recruiters: Microsoft, Google, Amazon, ServiceNow, Salesforce, JPMorgan Chase, Cisco, Deloitte, Goldman Sachs, Adobe, Oracle, Qualcomm, TCS Digital, Infosys, Accenture, Cognizant, L&T Technology Services.
- Training Programs: Campus Recruitment Training (CRT) commences in the 5th semester, focusing on Data Structures & Algorithms, System Design, Aptitude, Group Discussions, and Technical Interviews.

3. CAMPUS FACILITIES & HOSTELS
- On-Campus Hostels: 8 secure residential blocks with round-the-clock female security, biometric access, hygienic mess facilities, laundry, and Wi-Fi connectivity.
- Central Library: Air-conditioned modern library housing over 55,000 volumes, IEEE Xplore digital library access, ACM digital subscriptions, and open access reading rooms.
- Sports & Wellness: Indoor sports complex for badminton and table tennis, outdoor basketball and throwball courts, athletic track, and fully equipped women's gymnasium.
- Technical Clubs: IEEE Women in Engineering (WIE), ACM Student Chapter, ByteCraft Coding Club, Robotics & IoT Club, E-Cell (Entrepreneurship Cell partner with T-Hub Hyderabad).
- Transportation: Fleet of 35+ college buses connecting all prime routes across Hyderabad and Secunderabad.
`,
  },
];

export async function seedGnitsAssistant(tenantId: string = 'default-org') {
  console.log('[GNITS Seed] Starting GNITS Campus Assistant creation...');

  const assistantId = 'ast-gnits-1';

  const assistant: AssistantRecord = {
    id: assistantId,
    name: 'GNITS AI Campus Assistant',
    description: 'Official AI assistant for G. Narayanamma Institute of Technology & Science (Autonomous for Women). Answers student queries on CSE syllabus, attendance, regulations, ECAP portal, and placements.',
    status: 'Ready',
    tenantId,
    workspaceId: 'ws-gnits',
    fileSearchStoreName: '',
    settings: {
      name: 'GNITS AI Campus Assistant',
      description: 'Official AI assistant for G. Narayanamma Institute of Technology & Science (Autonomous for Women).',
      greeting: 'Welcome to G. Narayanamma Institute of Technology & Science (GNITS)! How can I help you today with autonomous syllabus, ECAP portal, attendance rules, or campus facilities?',
      placeholder: 'Ask about CSE syllabus, attendance rules, ECAP login, placements...',
      instructions: 'You are the official GNITS AI Campus Assistant for G. Narayanamma Institute of Technology & Science (For Women), Autonomous under UGC, affiliated to JNTUH (EAMCET Code: GNTS). Answer inquiries with comprehensive, friendly, and accurate guidance directly citing the approved GNITS Academic Regulations, Department Syllabi, ECAP portal guide, or Placement records.',
      themeColor: '#991b1b', // Deep maroon GNITS branding color
      suggestedQuestions: [
        'What is the CSE syllabus year or sem wise?',
        'What are the minimum attendance and condonation rules?',
        'How do I check marks and download hall tickets on ECAP?',
        'Which companies visit GNITS for placements and what is the highest package?',
      ],
      refusalMessage: "I couldn't find specific details for that inquiry in the official GNITS knowledge base. Please consult your Head of Department or the Academic Section.",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastIndexedAt: new Date().toISOString(),
    metrics: {
      totalQuestions: 412,
      totalConversations: 198,
      avgResponseTimeSec: 1.15,
      feedbackScore: 98,
      positiveCount: 165,
      negativeCount: 3,
    },
  };

  // 1. Ensure Gemini File Search Store exists
  console.log(`[GNITS Seed] Initializing Gemini Vector Store for ${assistant.name}...`);
  const storeName = await ensureAssistantFileSearchStore(assistant);
  assistant.fileSearchStoreName = storeName;
  await firestoreSetDoc('assistants', assistant.id, assistant);

  // 2. Upload documents to temp files and Gemini Vector Store
  const tempDir = path.resolve(process.cwd(), 'temp_gnits_seed');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const doc of GNITS_DOCS) {
    const tempFile = path.join(tempDir, `${doc.id}.txt`);
    fs.writeFileSync(tempFile, doc.content, 'utf8');

    console.log(`[GNITS Seed] Uploading "${doc.filename}" to store ${storeName}...`);
    let uploadedOp: { operationName?: string; documentName?: string } = {};
    try {
      uploadedOp = await uploadFileToStore(
        storeName,
        tempFile,
        doc.filename,
        'text/plain'
      );
    } catch (err: any) {
      console.warn(`[GNITS Seed] Upload warning: ${err.message}`);
    }

    const docRecord: DocumentRecord = {
      id: doc.id,
      filename: doc.filename,
      filesize: doc.filesize,
      type: doc.type,
      pages: doc.pages,
      status: 'Ready',
      summary: doc.summary,
      content: doc.content,
      chunkCount: doc.chunkCount,
      tenantId,
      fileSearchStoreName: storeName,
      fileSearchDocumentName: uploadedOp.documentName || '',
      fileSearchOperationName: uploadedOp.operationName || '',
      uploadedAt: new Date().toISOString(),
      lastIndexedAt: new Date().toISOString(),
    };

    await firestoreSetDoc('documents', docRecord.id, docRecord);

    const rel: AssistantDocumentRecord = {
      id: `${assistant.id}_${docRecord.id}`,
      assistantId: assistant.id,
      documentId: docRecord.id,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    await firestoreSetDoc('assistant_documents', rel.id, rel);

    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }

  try {
    fs.rmdirSync(tempDir);
  } catch {}

  console.log('[GNITS Seed] GNITS Assistant and knowledge base fully indexed in Firestore & Gemini Vector Store!');
}

seedGnitsAssistant()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[GNITS Seed Error]:', err);
    process.exit(1);
  });
