#!/usr/bin/env node
/**
 * Real gateway smoke test. Node 24+, fetch, Blob and FormData only; no mocks.
 * API_BASE_URL, INTEGRATION_ADMIN_EMAIL and INTEGRATION_ADMIN_PASSWORD required.
 * Creates isolated accounts/competitions with a unique suffix. Awarded data is
 * intentionally retained for audit. Run only against the integration stack.
 * Set INTEGRATION_TEAM_FLOW=0 to run only the individual journey.
 */
import { randomUUID } from 'node:crypto';

function requireCondition(condition, description) {
  if (!condition) throw new Error(description);
}

const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
let passed = 0;
let base;
function pass(description) {
  passed += 1;
  console.log(`PASS ${description}`);
}

/** Never echo request bodies, response bodies, credentials or transport errors. */
async function request(description, path, { method = 'GET', session, json, form, expected, bytes = false, headers = {} } = {}) {
  const url = `${base}${path}`;
  const requestHeaders = { ...headers };
  if (session) requestHeaders.Authorization = `Bearer ${session.accessToken}`;
  if (json !== undefined) requestHeaders['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
  } catch {
    throw new Error(`${description}: transport failed`);
  }
  const allowed = expected ?? [200, 201, 204];
  requireCondition(allowed.includes(response.status), `${description}: HTTP ${response.status}`);
  if (bytes) {
    return Buffer.from(await response.arrayBuffer());
  }
  const text = await response.text();
  if (!text) return undefined;
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error(`${description}: response was not JSON`); }
  if (typeof payload.success === 'boolean') {
    if (response.ok) requireCondition(payload.success, `${description}: unsuccessful response envelope`);
    return payload.data ?? payload.message;
  }
  return payload;
}

async function step(description, path, options) {
  const data = await request(description, path, options);
  pass(description);
  return data;
}

function validateSession(value, role, description) {
  requireCondition(typeof value?.accessToken === 'string' && value.accessToken.length > 0,
    `${description}: missing access token`);
  requireCondition(typeof value.userId === 'string' && value.role?.toUpperCase() === role,
    `${description}: incorrect account identity`);
  return value;
}

async function publicAccount(role, suffix) {
  const email = `smoke-${suffix}-${runId}@example.com`;
  const password = `SmokeAa-${randomUUID()}`;
  const result = await request(`${role} public registration`, '/users/register', {
    method: 'POST', json: { name: `Smoke ${suffix}`, email, password, role }, expected: [201],
  });
  const account = validateSession(result, role, `${role} registration`);
  pass(`${role} public registration issues the matching session`);
  return account;
}

/** A valid one-page PDF, allowing byte-for-byte MinIO/download verification. */
function evidencePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = 'BT /F1 12 Tf 20 120 Td (Competition integration evidence) Tj ET';
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const criteria = ['Originality', 'Execution'];
function scoreBody(competitionId, submissionId, judgeIndex, workIndex = 0) {
  return {
    competitionId, submissionId, judgeComments: 'Verified from the real API smoke journey.',
    scores: criteria.map((criterion, index) => ({ criterion, score: 8 + judgeIndex - workIndex - index * 2,
      // Legacy client weights must never change the backend's equal weighting.
      ...(judgeIndex === 0 && { weight: index === 0 ? 0.9 : 0.1 }),
    })),
  };
}

async function competitionJourney(type, organizer, participant, outsider, judges) {
  const prefix = type.toLowerCase();
  const now = Date.now();
  const competition = await request(`${prefix} create`, '/competitions', {
    method: 'POST', session: organizer, expected: [201], json: {
      name: `Smoke ${type} ${runId}`, description: 'A real gateway integration verification competition.',
      category: 'Programming & Technology', isPublic: true, status: 'UPCOMING', participationType: type,
      startDate: new Date(now - 60000).toISOString().slice(0, 19),
      endDate: new Date(now + 3600000).toISOString().slice(0, 19),
      allowedSubmissionTypes: ['PDF'], scoringCriteria: criteria,
    },
  });
  const competitionId = competition?.id;
  requireCondition(competitionId && competition.status === 'UPCOMING', `${prefix}: creation must be UPCOMING`);
  pass(`${prefix} Organizer creates an UPCOMING competition`);
  await step(`${prefix} Organizer assigns three real Judge accounts`, `/competitions/${competitionId}/assign-judges`, {
    method: 'POST', session: organizer, json: { judgeEmails: judges.map((judge) => judge.email) },
  });
  let teamId;
  if (type === 'TEAM') {
    const team = await request('team creation', '/teams/create', {
      method: 'POST', session: participant, expected: [201],
      json: { name: `Smoke Team ${runId}`, description: 'Integration team led by the participant.' },
    });
    teamId = team?.id;
    requireCondition(teamId, 'team creation: missing team ID');
    await step('team leader registers the team', `/registrations/teams/${competitionId}/${teamId}`, {
      method: 'POST', session: participant,
    });
  } else {
    for (const account of [participant, outsider]) {
      await step('individual Participant registers before opening', `/registrations/${competitionId}`, {
        method: 'POST', session: account,
      });
    }
  }
  const opened = await request(`${prefix} opening`, `/competitions/update/${competitionId}`, {
    method: 'PUT', session: organizer, json: { status: 'ONGOING' },
  });
  requireCondition(opened?.status === 'ONGOING', `${prefix}: opening status was not persisted`);
  pass(`${prefix} explicit opening enables submissions`);
  const fileBytes = evidencePdf();
  const submissions = [];
  const owners = type === 'TEAM' ? [participant] : [participant, outsider];
  for (let index = 0; index < owners.length; index += 1) {
    const params = new URLSearchParams({ competitionId, title: `Smoke ${prefix} work ${index + 1}`,
      description: 'Evidence file for a real approval and judging journey.', ...(teamId && { teamId }) });
    const form = new FormData();
    form.append('file', new Blob([fileBytes], { type: 'application/pdf' }), `evidence-${index + 1}.pdf`);
    await step(`${prefix} registered owner uploads real PDF bytes`, `/submissions/${teamId ? 'teams/' : ''}upload?${params}`, {
      method: 'POST', session: owners[index], form,
    });
    const own = await request(`${prefix} own submission`, teamId
      ? `/submissions/teams/${competitionId}/${teamId}` : `/submissions/${competitionId}`, { session: owners[index] });
    const submissionId = own?.id ?? own?.submissionId;
    requireCondition(submissionId && own.reviewStatus === 'PENDING', `${prefix}: upload must create a PENDING submission`);
    submissions.push(submissionId);
    await step(`${prefix} PENDING file is hidden from anonymous public downloads`, `/submissions/public/${submissionId}/download`, { expected: [404] });
    await step(`${prefix} Organizer approves the uploaded work`, '/submissions/review', {
      method: 'POST', session: organizer,
      json: { submissionId, reviewStatus: 'APPROVED', reviewComments: 'Approved integration evidence.' },
    });
  }
  const closed = await request(`${prefix} completion`, `/competitions/update/${competitionId}`, {
    method: 'PUT', session: organizer, json: { status: 'COMPLETED' },
  });
  requireCondition(closed?.status === 'COMPLETED', `${prefix}: completion status was not persisted`);
  pass(`${prefix} ending submissions opens judging`);
  await step(`${prefix} Participant cannot submit Judge scores`, '/judges/score', {
    method: 'POST', session: participant, json: scoreBody(competitionId, submissions[0], 0), expected: [403],
  });
  await step(`${prefix} completed competition cannot be deleted`, `/competitions/delete/${competitionId}`, { method: 'DELETE', session: organizer, expected: [409] });
  await step(`${prefix} completed submission cannot be deleted`, `/submissions/${teamId ? 'teams/' : ''}${submissions[0]}`, { method: 'DELETE', session: participant, expected: [409] });
  await step(`${prefix} Judge cannot submit an out-of-range score`, '/judges/score', {
    method: 'POST', session: judges[0], json: { ...scoreBody(competitionId, submissions[0], 0),
      scores: [{ criterion: 'Originality', score: 10.1 }, { criterion: 'Execution', score: 5 }] }, expected: [400],
  });
  for (let workIndex = 0; workIndex < submissions.length; workIndex += 1) {
    const submissionId = submissions[workIndex];
    for (let judgeIndex = 0; judgeIndex < judges.length; judgeIndex += 1) {
      const judge = judges[judgeIndex];
      const context = await request(`${prefix} Judge context`, `/judges/submissions/${submissionId}?competitionId=${competitionId}`, { session: judge });
      requireCondition(context?.id === submissionId && context.canScore && !context.hasScored
        && JSON.stringify(context.scoringCriteria) === JSON.stringify(criteria), `${prefix}: incorrect first-score context`);
      await request(`${prefix} Judge score`, '/judges/score', {
        method: 'POST', session: judge, json: scoreBody(competitionId, submissionId, judgeIndex, workIndex),
      });
      const detail = await request(`${prefix} persisted detail`, `/judges/${submissionId}/detail`, { session: judge });
      requireCondition(Number(detail?.totalScore) === 7 + judgeIndex - workIndex && !detail.requiresRescore,
        `${prefix}: persisted equal-weight total is incorrect`);
      pass(`${prefix} Judge ${judgeIndex + 1} persists an equal-weight 0–10 score for work ${workIndex + 1}`);
      if (judgeIndex === 1 && workIndex === 0) {
        const before = await request(`${prefix} insufficient eligibility`, `/winners/eligibility?competitionId=${competitionId}`, { session: organizer });
        requireCondition(!before?.canAward && before.submissions?.find((row) => row.submissionId === submissionId)?.judgeCount === 2,
          `${prefix}: two Judges incorrectly qualify a work`);
        await step(`${prefix} two-Judge auto-award is rejected`, `/winners/auto-award?competitionId=${competitionId}`, { method: 'POST', session: organizer, expected: [409] });
      }
    }
    if (workIndex === 0 && submissions.length > 1) {
      const partial = await request('all approved works eligibility', `/winners/eligibility?competitionId=${competitionId}`, { session: organizer });
      requireCondition(!partial?.canAward && partial.approvedCount === 2 && partial.eligibleCount === 1,
        'awarding must cover every approved work, including unscored work');
      pass('unscored second approved work blocks awarding even after three Judges score the first');
    }
  }
  const eligibility = await request(`${prefix} eligibility`, `/winners/eligibility?competitionId=${competitionId}`, { session: organizer });
  requireCondition(eligibility?.canAward && eligibility.minimumJudgeCount === 3
    && eligibility.approvedCount === submissions.length && eligibility.eligibleCount === submissions.length
    && eligibility.submissions.every((row) => row.eligible && row.judgeCount === 3), `${prefix}: fully-scored eligibility is incorrect`);
  pass(`${prefix} every approved work satisfies the authoritative three-Judge minimum`);
  await step(`${prefix} Organizer publishes awards`, `/winners/auto-award?competitionId=${competitionId}`, { method: 'POST', session: organizer });
  const published = await request(`${prefix} published competition`, `/competitions/${competitionId}`);
  requireCondition(published?.status === 'AWARDED', `${prefix}: award status was not finalized`);
  const winnersPath = `/winners/public-list?competitionId=${competitionId}&page=1&size=10`;
  const results = await request(`${prefix} public winners`, winnersPath);
  requireCondition(results?.data?.length === submissions.length
    && Number(results.data.find((row) => row.submissionId === submissions[0])?.totalScore) === 8,
    `${prefix}: public results do not match persisted snapshots`);
  pass(`${prefix} anonymous public results expose the persisted winners and score snapshots`);
  await step(`${prefix} repeated auto-award is idempotent`, `/winners/auto-award?competitionId=${competitionId}`, { method: 'POST', session: organizer });
  const repeated = await request(`${prefix} repeated results`, winnersPath);
  requireCondition(JSON.stringify(repeated.data) === JSON.stringify(results.data), `${prefix}: repeated award changed public results`);
  pass(`${prefix} repeated award preserves every published result`);
  await step(`${prefix} finalized scores cannot be revised`, `/judges/${submissions[0]}`, {
    method: 'PUT', session: judges[0], json: scoreBody(competitionId, submissions[0], 0), expected: [409],
  });
  const readOnly = await request(`${prefix} awarded context`, `/judges/submissions/${submissions[0]}?competitionId=${competitionId}`, { session: judges[0] });
  requireCondition(readOnly?.hasScored && !readOnly.canScore && readOnly.competitionStatus === 'AWARDED', `${prefix}: awarded context must be read-only`);
  for (const session of [participant, organizer, judges[0]]) {
    const bytes = await request(`${prefix} protected file`, `/submissions/${submissions[0]}/download`, { session, bytes: true });
    requireCondition(bytes.equals(fileBytes), `${prefix}: protected download changed file bytes`);
  }
  pass(`${prefix} owner, Organizer and assigned Judge download the exact private file bytes`);
  await step(`${prefix} private file requires a valid session`, `/submissions/${submissions[0]}/download`, { expected: [401] });
  await step(`${prefix} unrelated Participant cannot download another owner's private file`, `/submissions/${submissions[0]}/download`, { session: outsider, expected: [403] });
  const publicBytes = await request(`${prefix} approved public file`, `/submissions/public/${submissions[0]}/download`, { bytes: true });
  requireCondition(publicBytes.equals(fileBytes), `${prefix}: approved public file bytes differ`);
  pass(`${prefix} anonymous approved public file matches the stored evidence`);
  const publicStatistics = await request(`${prefix} anonymous public statistics`,
    `/dashboard/public/statistics?competitionId=${competitionId}&userId=${participant.userId}`);
  requireCondition(!['myTotalScore', 'myReviewStatus', 'hasSubmitted'].some((key) => Object.hasOwn(publicStatistics ?? {}, key)),
    `${prefix}: anonymous statistics exposed personal submission state`);
  pass(`${prefix} anonymous statistics ignore an untrusted userId query`);
}

async function privateMetadataJourney(admin, organizer, participant) {
  const now = Date.now();
  const competition = await request('private competition creation', '/competitions', {
    method: 'POST', session: organizer, expected: [201], json: {
      name: `Smoke private ${runId}`, description: 'Private integration metadata evidence.',
      category: 'Programming & Technology', isPublic: false, participationType: 'INDIVIDUAL',
      startDate: new Date(now - 60000).toISOString().slice(0, 19),
      endDate: new Date(now + 3600000).toISOString().slice(0, 19),
      allowedSubmissionTypes: ['PDF'], scoringCriteria: criteria,
    },
  });
  requireCondition(competition?.id && competition.isPublic === false, 'private competition was not persisted');
  const id = competition.id;
  await step('anonymous private competition metadata is hidden', `/competitions/${id}`, { expected: [404] });
  await step('managed competition metadata requires authentication', `/competitions/managed/${id}`, { expected: [401] });
  await step('unrelated Participant cannot read private managed metadata', `/competitions/managed/${id}`, { session: participant, expected: [404] });
  for (const account of [organizer, admin]) {
    const managed = await request('authorized private competition metadata', `/competitions/managed/${id}`, { session: account });
    requireCondition(managed?.id === id && managed.isPublic === false, 'authorized managed metadata is unavailable');
  }
  pass('owning Organizer and Admin can read private managed metadata');
  const batch = await request('visible metadata batch', '/competitions/batch/ids', { method: 'POST', session: participant, json: [id] });
  requireCondition(Array.isArray(batch) && batch.length === 0, 'metadata batch leaked a private competition');
  pass('metadata batches omit private competitions unrelated to the requester');
  for (const path of [
    `/winners/public-list?competitionId=${id}`,
    `/dashboard/public/statistics?competitionId=${id}&userId=${participant.userId}`,
    `/registrations/public/${id}/statistics`,
    `/registrations/public/${id}/participant-trend`,
    `/submissions/public/approved?competitionId=${id}`,
  ]) {
    await step('private competition data stays hidden from public reads', path, { expected: [404] });
  }
  const managedStatistics = await request('private Organizer dashboard', `/dashboard/statistics?competitionId=${id}`, { session: organizer });
  requireCondition(managedStatistics?.competitionName === competition.name, 'private managed statistics are unavailable');
  pass('private Organizer dashboard uses authenticated ownership');
  const managedWinners = await request('private Organizer finalized results', `/winners/list?competitionId=${id}`, { session: organizer });
  requireCondition(Array.isArray(managedWinners?.data) && managedWinners.data.length === 0, 'UPCOMING competition has unexpected awards');
  pass('private Organizer can read finalized-result state through the managed API');
}

async function main() {
  requireCondition(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24 or newer is required');
  requireCondition(process.env.API_BASE_URL && process.env.INTEGRATION_ADMIN_EMAIL && process.env.INTEGRATION_ADMIN_PASSWORD,
    'API_BASE_URL, INTEGRATION_ADMIN_EMAIL and INTEGRATION_ADMIN_PASSWORD are required');
  let parsed;
  try { parsed = new URL(process.env.API_BASE_URL); }
  catch { throw new Error('API_BASE_URL must be a valid HTTP(S) gateway URL'); }
  requireCondition(['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash,
    'API_BASE_URL must be an HTTP(S) gateway URL without credentials, query or fragment');
  base = parsed.href.replace(/\/$/, '');
  const admin = validateSession(await request('bootstrap Administrator login', '/users/login', {
    method: 'POST', json: { email: process.env.INTEGRATION_ADMIN_EMAIL, password: process.env.INTEGRATION_ADMIN_PASSWORD, role: 'ADMIN' },
  }), 'ADMIN', 'bootstrap Administrator login');
  pass('bootstrap Administrator authenticates through the real gateway');
  for (const role of ['ADMIN', 'JUDGE']) {
    await step(`public registration cannot create ${role}`, '/users/register', { method: 'POST', expected: [400],
      json: { name: 'Forbidden privileged signup', email: `forbidden-${role}-${runId}@example.com`, password: `SmokeAa-${randomUUID()}`, role } });
  }
  const participant = await publicAccount('PARTICIPANT', 'participant');
  const outsider = await publicAccount('PARTICIPANT', 'outsider');
  const organizer = await publicAccount('ORGANIZER', 'organizer');
  await step('Participant cannot provision privileged accounts', '/users/admin/accounts', {
    method: 'POST', session: participant, expected: [403],
    json: { name: 'Forbidden Judge', email: `forbidden-provision-${runId}@example.com`, password: `SmokeAa-${randomUUID()}`, role: 'JUDGE' },
  });
  const judges = [];
  for (let index = 1; index <= 3; index += 1) {
    const email = `smoke-judge-${index}-${runId}@example.com`;
    const password = `SmokeAa-${randomUUID()}`;
    const account = await request('Administrator provisions Judge', '/users/admin/accounts', {
      method: 'POST', session: admin, expected: [201], json: { name: `Smoke Judge ${index}`, email, password, role: 'JUDGE' },
    });
    requireCondition(account?.id && account.role?.toUpperCase() === 'JUDGE' && !account.accessToken,
      'privileged provisioning must return account data without replacing the Administrator session');
    const session = validateSession(await request('provisioned Judge login', '/users/login', {
      method: 'POST', json: { email, password, role: 'JUDGE' },
    }), 'JUDGE', 'provisioned Judge login');
    judges.push({ ...session, email });
    pass(`Administrator provisions Judge ${index}, who authenticates independently`);
  }
  const profile = await request('Administrator session remains active', '/users/profile', { session: admin });
  requireCondition(profile?.email?.toLowerCase() === admin.email?.toLowerCase(), 'Judge provisioning changed the Administrator session');
  pass('Judge provisioning preserves the authenticated Administrator session');
  await step('gateway denies internal submission access even with forged service headers', '/submissions/internal/approved?competitionId=blocked', {
    session: admin, expected: [403], headers: { 'X-Service-Token': 'forged', 'User-Role': 'ADMIN', 'User-ID': 'forged' },
  });
  await privateMetadataJourney(admin, organizer, participant);
  await competitionJourney('INDIVIDUAL', organizer, participant, outsider, judges);
  if (process.env.INTEGRATION_TEAM_FLOW !== '0') await competitionJourney('TEAM', organizer, participant, outsider, judges);
  pass(`complete: ${passed} verified real API checks`);
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
