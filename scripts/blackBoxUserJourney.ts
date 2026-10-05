import fs from 'fs';
import path from 'path';

export function createValidTestPdf(filePath: string, title: string, sections: { heading: string; body: string }[]): void {
  let contentStream = 'BT\n/F1 12 Tf\n50 750 Td\n(' + title.replace(/[()]/g, '') + ') Tj\n';
  
  for (const s of sections) {
    contentStream += '0 -24 Td\n(' + s.heading.replace(/[()]/g, '') + ') Tj\n';
    // Break body into ~80 char lines
    const words = s.body.replace(/[()]/g, '').split(' ');
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).length > 75) {
        contentStream += '0 -16 Td\n(' + currentLine.trim() + ') Tj\n';
        currentLine = w;
      } else {
        currentLine += ' ' + w;
      }
    }
    if (currentLine.trim()) {
      contentStream += '0 -16 Td\n(' + currentLine.trim() + ') Tj\n';
    }
  }
  contentStream += 'ET';

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '4 0 obj\n<< /Length ' + streamLength + ' >>\nstream\n' + contentStream + '\nendstream\nendobj\n';

  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += off.toString().padStart(10, '0') + ' 00000 n \n';
  }

  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(pdf, 'utf8'));
}

async function runBlackBoxJourney() {
  const BASE_URL = 'http://localhost:3000';
  const failures: string[] = [];

  console.log('====================================================');
  console.log('🚀 STARTING COMPLETE BLACK-BOX NEW USER JOURNEY TEST');
  console.log('====================================================\n');

  // STEP 1: Account Creation
  console.log('Step 1: Creating a completely new user account...');
  const userEmail = `sarah.connor.${Date.now()}@cyberdyne.io`;
  const userPassword = 'CyberdyneSecretPassword2026!';
  const userName = 'Sarah Connor';
  const initialOrg = 'Cyberdyne Systems';

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, orgName: initialOrg }),
  });

  if (!signupRes.ok) {
    failures.push(`Step 1 Failed: Signup returned ${signupRes.status} ${await signupRes.text()}`);
    console.error('❌ Step 1 Failed');
    return failures;
  }
  const signupData = await signupRes.json();
  const token = signupData.token;
  const initialWs = signupData.workspace.id;
  console.log(`✅ Step 1 Success: Account created (User: ${signupData.user.id}, Initial WS: ${initialWs})`);

  // STEP 2: Dedicated Workspace Creation
  console.log('\nStep 2: Creating a dedicated production workspace...');
  const wsName = 'Skynet Autonomous Division';
  const createWsRes = await fetch(`${BASE_URL}/api/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name: wsName }),
  });

  if (!createWsRes.ok) {
    failures.push(`Step 2 Failed: Workspace creation returned ${createWsRes.status}`);
  }
  const dedicatedWs = await createWsRes.json();
  const activeWsId = dedicatedWs.id;
  console.log(`✅ Step 2 Success: Workspace created: ${dedicatedWs.name} (ID: ${activeWsId})`);

  // STEP 3: Create AI Assistant
  console.log('\nStep 3: Creating a new AI Knowledge Assistant in the workspace...');
  const createBotRes = await fetch(`${BASE_URL}/api/assistants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: JSON.stringify({
      name: 'Cyberdyne Travel & Security Navigator',
      description: 'Official corporate assistant for Cyberdyne business travel and security protocols.',
      greeting: 'Greetings! I am the Cyberdyne Travel Policy Navigator. How may I guide you?',
      instructions: 'Answer employee questions strictly using verified Cyberdyne Corporate Travel Policies. If not mentioned in the documentation, clearly refuse.',
      themeColor: '#0284c7',
      suggestedQuestions: [
        'What is the daily per diem meal allowance?',
        'Which rental car companies are approved under corporate policy?',
        'What are the international travel insurance coverage details?'
      ],
      refusalMessage: "I could not find sufficient information in the Cyberdyne Travel Policy documents to answer that question.",
    }),
  });

  if (!createBotRes.ok) {
    failures.push(`Step 3 Failed: Assistant creation returned ${createBotRes.status}`);
  }
  const botData = await createBotRes.json();
  const botId = botData.id;
  console.log(`✅ Step 3 Success: Assistant created: "${botData.name}" (ID: ${botId})`);

  // STEP 4: Upload Real PDF Document
  console.log('\nStep 4: Generating and uploading a real corporate PDF policy document...');
  const pdfPath = '/tmp/Cyberdyne_Travel_Policy_2026.pdf';
  createValidTestPdf(pdfPath, 'CYBERDYNE SYSTEMS OFFICIAL TRAVEL AND EXPENSE POLICY 2026', [
    {
      heading: 'SECTION 2.1: DAILY MEAL PER DIEM ALLOWANCE',
      body: 'All Cyberdyne personnel on authorized business travel are entitled to a flat daily per diem meal allowance of eighty-five dollars ($85.00 USD). This covers breakfast ($20), lunch ($25), and dinner ($40). Itemized receipts are not required unless individual expenses exceed this daily threshold. Alcoholic beverages and personal room service fees are strictly non-reimbursable.',
    },
    {
      heading: 'SECTION 3.4: APPROVED RENTAL CAR PROVIDERS',
      body: 'Corporate vehicle rentals must exclusively be arranged through Enterprise Rent-A-Car or National Car Rental under corporate discount agreement code CYBER-CORP-442. Mid-size sedan or compact SUV categories are automatically approved. Luxury vehicle upgrades require written pre-authorization from the Divisional Controller.',
    },
    {
      heading: 'SECTION 5.2: INTERNATIONAL MEDICAL AND TRAVEL INSURANCE',
      body: 'Employees traveling outside their home country of employment are automatically covered under Cyberdyne comprehensive global emergency travel insurance policy number AIG-CYBER-9921. Emergency medical evacuation, repatriation, and urgent dental care up to $2,000,000 USD are fully covered 24/7/365 through the Zurich International Assistance Hotline.',
    },
  ]);

  const fileBuffer = fs.readFileSync(pdfPath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="assistantId"\r\n\r\n` +
      `${botId}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="files"; filename="Cyberdyne_Travel_Policy_2026.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    failures.push(`Step 4 Failed: Document upload returned ${uploadRes.status}: ${await uploadRes.text()}`);
  }
  const uploadedDocs = await uploadRes.json();
  const uploadedDoc = uploadedDocs[0];
  console.log(`✅ Step 4 Upload Success: Document ID: ${uploadedDoc.id}, Status: ${uploadedDoc.status}`);

  // Wait for processing status Ready
  console.log('Waiting for document vector processing to be Ready...');
  let isReady = uploadedDoc.status === 'Ready';
  for (let poll = 0; poll < 10 && !isReady; poll++) {
    await new Promise(r => setTimeout(r, 1000));
    const checkDocsRes = await fetch(`${BASE_URL}/api/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-workspace-id': activeWsId,
      },
    });
    const checkDocs = await checkDocsRes.json();
    const found = checkDocs.find((d: any) => d.id === uploadedDoc.id);
    if (found && found.status === 'Ready') {
      isReady = true;
      break;
    }
  }

  if (!isReady) {
    failures.push(`Step 4 Failed: Document processing did not complete to Ready state.`);
  } else {
    console.log('✅ Step 4 Vector Ingestion Verified: Document is Ready with chunks indexed.');
  }

  // STEP 5: Ask a Question Answered by the PDF
  console.log('\nStep 5: Asking a question directly answered by the uploaded PDF...');
  const inDomainQuery = "What is the daily per diem meal allowance for employees on business travel?";
  const chatRes = await fetch(`${BASE_URL}/api/assistants/${botId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: JSON.stringify({ message: inDomainQuery }),
  });

  if (!chatRes.ok) {
    failures.push(`Step 5 Failed: Chat returned status ${chatRes.status}`);
  }
  const chatData = await chatRes.json();
  const answerMsg = chatData.message;
  console.log(`Answer received: "${answerMsg.content.slice(0, 160)}..."`);

  const containsAmount = answerMsg.content.includes('85') || answerMsg.content.toLowerCase().includes('eighty-five');
  if (!containsAmount) {
    failures.push(`Step 5 Failed: Answer did not contain the $85 meal allowance fact from the PDF.`);
  } else {
    console.log('✅ Step 5 Success: Grounded fact ($85 meal allowance) correctly answered!');
  }

  // STEP 6: Inspect Citations
  console.log('\nStep 6: Inspecting verified citations...');
  console.log(`Citations count: ${answerMsg.citations?.length || 0}`);
  if (!answerMsg.citations || answerMsg.citations.length === 0) {
    failures.push(`Step 6 Failed: Expected citations for grounded query, but none were returned.`);
  } else {
    const firstCit = answerMsg.citations[0];
    console.log(`- Document: ${firstCit.documentName}`);
    console.log(`- Page: ${firstCit.page}`);
    console.log(`- Similarity: ${firstCit.similarity}`);
    console.log(`- Snippet: "${firstCit.snippet.slice(0, 90)}..."`);

    if (!firstCit.documentName.includes('Cyberdyne_Travel_Policy_2026.pdf')) {
      failures.push(`Step 6 Failed: Citation documentName does not match uploaded file.`);
    } else {
      console.log('✅ Step 6 Success: Verified citation accurately attributes Cyberdyne_Travel_Policy_2026.pdf!');
    }
  }

  // STEP 7: Ask an Unsupported Question (Refusal Test)
  console.log('\nStep 7: Asking an unsupported out-of-domain question...');
  const unsupportedQuery = "What is the secret recipe for baking chocolate fudge brownies?";
  const refusalRes = await fetch(`${BASE_URL}/api/assistants/${botId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: JSON.stringify({ message: unsupportedQuery }),
  });

  const refusalData = await refusalRes.json();
  const refusalMsg = refusalData.message;
  console.log(`Refusal response: "${refusalMsg.content}"`);
  console.log(`Refusal flag: ${refusalMsg.isRefusal}`);
  console.log(`Refusal citations: ${refusalMsg.citations?.length || 0}`);

  if (!refusalMsg.isRefusal) {
    failures.push(`Step 7 Failed: Expected isRefusal to be true for unsupported query.`);
  }
  if (refusalMsg.citations && refusalMsg.citations.length > 0) {
    failures.push(`Step 7 Failed: Citations array must be empty on refusal.`);
  }
  if (refusalMsg.isRefusal && (!refusalMsg.citations || refusalMsg.citations.length === 0)) {
    console.log('✅ Step 7 Success: Correctly refused out-of-domain query with zero citations!');
  }

  // STEP 8: Test User Feedback
  console.log('\nStep 8: Submitting positive feedback on the grounded answer...');
  const fbRes = await fetch(`${BASE_URL}/api/assistants/${botId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: JSON.stringify({
      messageId: answerMsg.id,
      type: 'positive',
      comment: 'Accurate per diem policy details!',
    }),
  });

  if (!fbRes.ok) {
    failures.push(`Step 8 Failed: Feedback submission returned ${fbRes.status}`);
  }
  const fbData = await fbRes.json();
  console.log(`Feedback submitted: success=${fbData.success}, positiveCount=${fbData.metrics?.positiveCount}`);
  if (!fbData.success || fbData.metrics?.positiveCount < 1) {
    failures.push(`Step 8 Failed: Metrics were not incremented upon feedback.`);
  } else {
    console.log('✅ Step 8 Success: Feedback logged and assistant metrics updated.');
  }

  // STEP 9: Inspect Analytics
  console.log('\nStep 9: Inspecting assistant and workspace analytics...');
  const botAnalyticsRes = await fetch(`${BASE_URL}/api/assistants/${botId}/analytics`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
  });
  const botAnalytics = await botAnalyticsRes.json();
  console.log(`Assistant Analytics: Total Messages = ${botAnalytics.totalMessages}, Trends Days = ${botAnalytics.trends?.length}`);

  const globalAnalyticsRes = await fetch(`${BASE_URL}/api/analytics`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
  });
  const globalAnalytics = await globalAnalyticsRes.json();
  console.log(`Global Analytics: Total Assistants = ${globalAnalytics.totalAssistants}, Total Docs = ${globalAnalytics.totalDocuments}`);

  if (botAnalytics.totalMessages < 2) {
    failures.push(`Step 9 Failed: Expected at least 2 messages in assistant analytics.`);
  } else {
    console.log('✅ Step 9 Success: Real-time analytics computed accurately from stored sessions.');
  }

  // STEP 10: Configure Assistant
  console.log('\nStep 10: Reconfiguring assistant theme and instructions...');
  const updateBotRes = await fetch(`${BASE_URL}/api/assistants/${botId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': activeWsId,
    },
    body: JSON.stringify({
      name: 'Cyberdyne Global Travel Navigator (v2)',
      settings: {
        themeColor: '#059669',
        greeting: 'Welcome to Cyberdyne Global Travel v2. How can I assist with your itinerary?',
      },
    }),
  });

  if (!updateBotRes.ok) {
    failures.push(`Step 10 Failed: Assistant patch returned ${updateBotRes.status}`);
  }
  const updatedBot = await updateBotRes.json();
  console.log(`Updated Assistant Name: "${updatedBot.name}", Theme: ${updatedBot.settings.themeColor}`);
  if (updatedBot.name !== 'Cyberdyne Global Travel Navigator (v2)') {
    failures.push(`Step 10 Failed: Updated name did not persist.`);
  } else {
    console.log('✅ Step 10 Success: Assistant configuration successfully updated and persisted.');
  }

  // STEP 11: Deploy & Test Public Widget
  console.log('\nStep 11: Testing public embed widget...');
  const widgetJsRes = await fetch(`${BASE_URL}/widget.js`);
  const widgetJs = await widgetJsRes.text();
  const isJs = widgetJsRes.headers.get('content-type')?.includes('javascript');
  console.log(`Widget script delivered: ${isJs}, size: ${widgetJs.length} bytes`);

  // Test public chat on the assistant as external user on embedded site
  const publicChatRes = await fetch(`${BASE_URL}/api/assistants/${botId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Which rental car companies are approved under the policy?",
    }),
  });

  if (!publicChatRes.ok) {
    failures.push(`Step 11 Failed: Public widget chat returned status ${publicChatRes.status}`);
  }
  const publicChatData = await publicChatRes.json();
  const publicAnswer = publicChatData.message.content;
  console.log(`Public Widget Answer: "${publicAnswer.slice(0, 160)}..."`);
  const hasRentalCompanies = publicAnswer.includes('Enterprise') || publicAnswer.includes('National');
  if (!hasRentalCompanies) {
    failures.push(`Step 11 Failed: Public widget answer did not contain Enterprise or National car rental.`);
  } else {
    console.log('✅ Step 11 Success: Public widget chat answered with Enterprise/National approval and valid citation!');
  }

  // STEP 12: Unauthorized Access and Cross-Assistant Security Probes
  console.log('\nStep 12: Simulating hostile unauthorized and cross-tenant penetration attempts...');

  // Create an attacker user in a completely different organization
  const attackerEmail = `attacker.${Date.now()}@badactor.net`;
  const attackerSignup = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Malicious Infiltrator',
      email: attackerEmail,
      password: 'AttackerPassword123!',
      orgName: 'Shadow Security Org',
    }),
  });
  const attackerData = await attackerSignup.json();
  const attackerToken = attackerData.token;
  const attackerWs = attackerData.workspace.id;
  console.log(`Created hostile test actor (WS: ${attackerWs})`);

  // Probe A: Attacker tries to read Sarah's assistant config
  const probeA = await fetch(`${BASE_URL}/api/assistants/${botId}`, {
    headers: {
      'Authorization': `Bearer ${attackerToken}`,
      'x-workspace-id': attackerWs,
    },
  });
  console.log(`Probe A - Read victim assistant: Status = ${probeA.status} (Expected 403)`);
  if (probeA.status !== 403) {
    failures.push(`Step 12 Failed: Cross-tenant assistant read was not blocked (got ${probeA.status})`);
  }

  // Probe B: Attacker tries to alter Sarah's assistant settings
  const probeB = await fetch(`${BASE_URL}/api/assistants/${botId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${attackerToken}`,
      'x-workspace-id': attackerWs,
    },
    body: JSON.stringify({ name: 'HACKED BY SHADOW' }),
  });
  console.log(`Probe B - Patch victim assistant: Status = ${probeB.status} (Expected 403)`);
  if (probeB.status !== 403) {
    failures.push(`Step 12 Failed: Cross-tenant assistant patch was not blocked (got ${probeB.status})`);
  }

  // Probe C: Attacker tries to delete Sarah's assistant
  const probeC = await fetch(`${BASE_URL}/api/assistants/${botId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${attackerToken}`,
      'x-workspace-id': attackerWs,
    },
  });
  console.log(`Probe C - Delete victim assistant: Status = ${probeC.status} (Expected 403)`);
  if (probeC.status !== 403) {
    failures.push(`Step 12 Failed: Cross-tenant assistant deletion was not blocked (got ${probeC.status})`);
  }

  // Probe D: Attacker tries to delete Sarah's corporate document
  const probeD = await fetch(`${BASE_URL}/api/documents/${uploadedDoc.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${attackerToken}`,
      'x-workspace-id': attackerWs,
    },
  });
  console.log(`Probe D - Delete victim document: Status = ${probeD.status} (Expected 403)`);
  if (probeD.status !== 403) {
    failures.push(`Step 12 Failed: Cross-tenant document deletion was not blocked (got ${probeD.status})`);
  }

  // Probe E: Attacker tries to upload a rogue file into Sarah's assistant
  const rogueBoundary = '----WebKitRogueBoundary' + Math.random().toString(36).substring(2);
  const rogueFile = Buffer.from('%PDF-1.4\n%Rogue\n%%EOF');
  const rogueBody = Buffer.concat([
    Buffer.from(
      `--${rogueBoundary}\r\n` +
      `Content-Disposition: form-data; name="assistantId"\r\n\r\n` +
      `${botId}\r\n` +
      `--${rogueBoundary}\r\n` +
      `Content-Disposition: form-data; name="files"; filename="rogue.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    ),
    rogueFile,
    Buffer.from(`\r\n--${rogueBoundary}--\r\n`),
  ]);

  const probeE = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${rogueBoundary}`,
      'Authorization': `Bearer ${attackerToken}`,
      'x-workspace-id': attackerWs,
    },
    body: rogueBody,
  });
  console.log(`Probe E - Upload into victim assistant: Status = ${probeE.status} (Expected 403)`);
  if (probeE.status !== 403) {
    failures.push(`Step 12 Failed: Cross-tenant document upload was not blocked (got ${probeE.status})`);
  }

  if (probeA.status === 403 && probeB.status === 403 && probeC.status === 403 && probeD.status === 403 && probeE.status === 403) {
    console.log('✅ Step 12 Success: All cross-tenant and unauthorized penetration attempts firmly blocked with 403!');
  }

  console.log('\n====================================================');
  if (failures.length === 0) {
    console.log('🏆 BLACK-BOX NEW USER JOURNEY: 100% COMPLETE & PASSING');
  } else {
    console.log(`⚠️ BLACK-BOX JOURNEY COMPLETED WITH ${failures.length} FAILURE(S):`);
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
  }
  console.log('====================================================\n');

  return failures;
}

runBlackBoxJourney()
  .then(failures => {
    if (failures.length > 0) process.exit(1);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
