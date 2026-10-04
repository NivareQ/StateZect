export const SCHEMA_VERSION = 2;
export const BACKUP_FORMAT = 'nivareq-pulse-backup';
export const BACKUP_VERSION = 2;
export const PROJECT_PACK_FORMAT = 'nivareq-pulse-project-pack';
export const PROJECT_PACK_VERSION = 2;
export const UPDATE_PACKET_FORMAT = 'nivareq-pulse-project-update';
export const UPDATE_PACKET_VERSION = 1;
export const BOOTSTRAP_PACKET_FORMAT = 'nivareq-pulse-project-bootstrap';
export const BOOTSTRAP_PACKET_VERSION = 1;

export const PROJECT_TYPES = {
  software: {
    label: 'Software',
    description: 'Apps, websites, tools, and other software work.',
    stages: ['Foundation', 'Development', 'Testing', 'Release Candidate', 'Released', 'Maintenance'],
    quickUpdates: ['Candidate created', 'Automated checks passed', 'Real-device pass', 'Real-device fail', 'Accepted baseline', 'Public release', 'Bug found', 'Bug fixed', 'Gate opened', 'Gate closed', 'Waiting', 'Resumed'],
    nextSuggestions: ['Build the next candidate', 'Run real-device testing', 'Fix the current blocker', 'Review the next milestone']
  },
  writing: {
    label: 'Writing',
    description: 'Novels, articles, essays, scripts, and other written work.',
    stages: ['Idea', 'Research', 'Outline', 'Drafting', 'Revision', 'Editing', 'Complete'],
    quickUpdates: ['Draft progress', 'Section / chapter complete', 'Research found', 'Revision complete', 'Feedback received', 'Decision made', 'Waiting', 'Resumed'],
    nextSuggestions: ['Draft the next section', 'Research a question', 'Review and revise', 'Get feedback']
  },
  film: {
    label: 'Film / Video',
    description: 'Short films, videos, shoots, and editing ProZects.',
    stages: ['Concept', 'Writing', 'Pre-production', 'Production', 'Editing', 'Review', 'Complete'],
    quickUpdates: ['Script progress', 'Pre-production progress', 'Shoot progress', 'Edit progress', 'Review / feedback', 'Problem found', 'Milestone reached', 'Waiting', 'Resumed'],
    nextSuggestions: ['Lock the script', 'Plan the next shoot', 'Secure a location or resource', 'Edit the next sequence']
  },
  making: {
    label: 'Making / Workshop',
    description: 'Woodwork, builds, repairs, fabrication, and hands-on ProZects.',
    stages: ['Idea', 'Design', 'Materials', 'Build', 'Assembly', 'Finishing', 'Complete'],
    quickUpdates: ['Materials acquired', 'Part completed', 'Assembly progress', 'Problem found', 'Design changed', 'Milestone reached', 'Waiting', 'Resumed'],
    nextSuggestions: ['Buy or prepare materials', 'Measure and plan', 'Build the next part', 'Finish or test the current part']
  },
  research: {
    label: 'Research',
    description: 'Questions, investigations, source gathering, and synthesis.',
    stages: ['Question', 'Research', 'Organizing', 'Synthesis', 'Drafting', 'Review', 'Complete'],
    quickUpdates: ['Source found', 'Finding recorded', 'Research progress', 'Synthesis progress', 'Draft progress', 'Decision made', 'Milestone reached', 'Waiting', 'Resumed'],
    nextSuggestions: ['Find more sources', 'Organize the evidence', 'Write up the finding', 'Review the conclusion']
  },
  general: {
    label: 'General',
    description: 'Anything meaningful that needs a current state and a next step.',
    stages: ['Idea', 'Planning', 'In progress', 'Waiting', 'Review', 'Complete'],
    quickUpdates: ['Progress made', 'Milestone reached', 'Problem found', 'Decision made', 'Waiting', 'Resumed'],
    nextSuggestions: ['Do the next step', 'Make the next decision', 'Resolve the current problem', 'Follow up on what is waiting']
  }
};

export const LIFECYCLES = ['active', 'paused', 'completed', 'archived'];
export const ATTENTION_STATES = ['clear', 'needs_attention', 'blocked', 'waiting'];
export const NEED_STATES = ['open', 'waiting', 'done'];
export const GUARDRAIL_KINDS = ['protect', 'gate', 'decision'];
export const GUARDRAIL_STATES = ['active', 'open', 'closed', 'retired'];

export function projectAppearsInState(project) {
  if (!project || project.lifecycle !== 'active') return false;
  if (project.type !== 'software') return true;
  const stage = String(project.stage || '').trim().toLowerCase();
  if (!stage) return true;
  if (stage === 'maintenance' || stage === 'released' || stage === 'complete' || stage === 'completed') return false;
  if (stage.includes('maintenance mode')) return false;
  if (stage.includes('public release') && !stage.includes('candidate')) return false;
  return true;
}

const id = (prefix = 'id') => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const clean = (value = '') => String(value ?? '').trim();
const clone = value => structuredClone(value);
const revision = value => Number.isInteger(Number(value)) && Number(value) >= 1 ? Number(value) : 1;

export function createProject(input, timestamp = now()) {
  const name = clean(input.name);
  if (!name) throw new Error('ProZect name is required.');
  const type = PROJECT_TYPES[input.type] ? input.type : 'general';
  const lifecycle = LIFECYCLES.includes(input.lifecycle) && input.lifecycle !== 'archived' ? input.lifecycle : 'active';
  const attention = ATTENTION_STATES.includes(input.attention) ? input.attention : 'clear';
  return {
    id: input.id || id('project'),
    name,
    type,
    description: clean(input.description),
    lifecycle,
    stage: clean(input.stage) || PROJECT_TYPES[type].stages[0],
    attention,
    currentSummary: clean(input.currentSummary),
    nextSummary: clean(input.nextSummary),
    nextNeedId: clean(input.nextNeedId) || null,
    revision: revision(input.revision),
    checkpoints: {
      published: clean(input.checkpoints?.published),
      accepted: clean(input.checkpoints?.accepted),
      candidate: clean(input.checkpoints?.candidate)
    },
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
    archivedAt: input.archivedAt || null,
    completedAt: lifecycle === 'completed' ? (input.completedAt || timestamp) : null
  };
}

export function bumpProjectRevision(project, timestamp = now()) {
  return { ...clone(project), revision: revision(project?.revision) + 1, updatedAt: timestamp };
}

export function createPulseEntry(projectId, input = {}, timestamp = now()) {
  if (!projectId) throw new Error('ProZect ID is required.');
  const kind = clean(input.kind) || 'Progress';
  const summary = clean(input.summary) || kind;
  const occurredAt = input.occurredAt || timestamp;
  return {
    id: input.id || id('pulse'),
    projectId,
    occurredAt,
    kind,
    summary,
    detail: clean(input.detail),
    changes: input.changes ? clone(input.changes) : {},
    updatedAt: input.updatedAt || occurredAt,
    editedAt: input.editedAt || null,
    original: input.original ? clone(input.original) : null,
    removedAt: input.removedAt || null
  };
}

export function editPulseEntry(entry, patch, timestamp = now()) {
  if (!entry) throw new Error('History entry is required.');
  const next = clone(entry);
  if (!next.original) next.original = { kind: next.kind, summary: next.summary, detail: next.detail || '' };
  if (patch.kind !== undefined && clean(patch.kind)) next.kind = clean(patch.kind);
  if (patch.summary !== undefined && clean(patch.summary)) next.summary = clean(patch.summary);
  if (patch.detail !== undefined) next.detail = clean(patch.detail);
  next.editedAt = timestamp;
  next.updatedAt = timestamp;
  return next;
}

export function removePulseEntry(entry, timestamp = now()) {
  if (!entry) throw new Error('History entry is required.');
  return { ...clone(entry), removedAt: timestamp, updatedAt: timestamp };
}

export function restorePulseEntry(entry, timestamp = now()) {
  if (!entry) throw new Error('History entry is required.');
  return { ...clone(entry), removedAt: null, updatedAt: timestamp };
}

export function applyPulseUpdate(project, input, timestamp = now()) {
  if (!project || project.lifecycle === 'archived') throw new Error('Archived ProZects must be restored before updating.');
  let next = clone(project);
  const changes = {};
  const set = (key, value) => {
    if (value === undefined) return;
    if (next[key] !== value) { changes[key] = { from: next[key], to: value }; next[key] = value; }
  };
  if (input.lifecycle && LIFECYCLES.includes(input.lifecycle) && input.lifecycle !== 'archived') set('lifecycle', input.lifecycle);
  if (input.stage !== undefined && clean(input.stage)) set('stage', clean(input.stage));
  if (input.attention && ATTENTION_STATES.includes(input.attention)) set('attention', input.attention);
  if (input.currentSummary !== undefined) set('currentSummary', clean(input.currentSummary));
  if (input.checkpoints) {
    const before = clone(next.checkpoints || { published:'', accepted:'', candidate:'' });
    const after = { ...before };
    for (const key of ['published', 'accepted', 'candidate']) if (input.checkpoints[key] !== undefined) after[key] = clean(input.checkpoints[key]);
    if (JSON.stringify(before) !== JSON.stringify(after)) { changes.checkpoints = { from: before, to: after }; next.checkpoints = after; }
  }
  if (next.lifecycle === 'completed' && !next.completedAt) next.completedAt = timestamp;
  if (next.lifecycle !== 'completed') next.completedAt = null;
  next = bumpProjectRevision(next, timestamp);
  const entry = createPulseEntry(project.id, { ...input, changes }, timestamp);
  return { project: next, entry };
}

export function promoteCandidate(project, timestamp = now()) {
  if (!project?.checkpoints?.candidate) throw new Error('There is no current candidate to accept.');
  return applyPulseUpdate(project, {
    kind: 'Accepted baseline',
    summary: `${project.checkpoints.candidate} accepted as the current baseline`,
    currentSummary: `${project.checkpoints.candidate} accepted`,
    attention: 'clear',
    checkpoints: { accepted: project.checkpoints.candidate, candidate: '' }
  }, timestamp);
}

export function createNeed(projectId, input, timestamp = now()) {
  const title = clean(input.title);
  if (!title) throw new Error('Need title is required.');
  const state = NEED_STATES.includes(input.state) ? input.state : 'open';
  return {
    id: input.id || id('need'), projectId, title, state, isNext: Boolean(input.isNext),
    createdAt: input.createdAt || timestamp, updatedAt: input.updatedAt || timestamp,
    resolvedAt: state === 'done' ? (input.resolvedAt || timestamp) : null
  };
}

export function updateNeed(need, patch, timestamp = now()) {
  const next = { ...need };
  if (patch.title !== undefined && clean(patch.title)) next.title = clean(patch.title);
  if (patch.state && NEED_STATES.includes(patch.state)) next.state = patch.state;
  if (patch.isNext !== undefined) next.isNext = Boolean(patch.isNext);
  next.updatedAt = timestamp;
  next.resolvedAt = next.state === 'done' ? (need.resolvedAt || timestamp) : null;
  if (next.state === 'done') next.isNext = false;
  return next;
}

export function setProjectNext(project, needs, needId, timestamp = now()) {
  const rows = (needs || []).map(clone);
  let selected = null;
  if (needId) {
    selected = rows.find(n => n.id === needId && n.projectId === project.id);
    if (!selected) throw new Error('The selected Next Need does not belong to this ProZect.');
    if (selected.state === 'done') throw new Error('A completed Need cannot be Next.');
  }
  const updatedNeeds = rows.map(n => {
    if (n.projectId !== project.id) return n;
    const flag = Boolean(selected && n.id === selected.id);
    return n.isNext === flag ? n : updateNeed(n, { isNext: flag }, timestamp);
  });
  const next = bumpProjectRevision(project, timestamp);
  next.nextNeedId = selected?.id || null;
  next.nextSummary = selected?.title || '';
  return { project: next, needs: updatedNeeds };
}

export function createGuardrail(projectId, input, timestamp = now()) {
  const title = clean(input.title);
  if (!title) throw new Error('Guardrail title is required.');
  const kind = GUARDRAIL_KINDS.includes(input.kind) ? input.kind : 'protect';
  let state = GUARDRAIL_STATES.includes(input.state) ? input.state : 'active';
  if (kind === 'gate' && !['open', 'closed', 'retired'].includes(state)) state = 'closed';
  return { id: input.id || id('guard'), projectId, title, kind, state, createdAt: input.createdAt || timestamp, updatedAt: input.updatedAt || timestamp };
}

export function updateGuardrail(guardrail, patch, timestamp = now()) {
  const next = { ...guardrail };
  if (patch.title !== undefined && clean(patch.title)) next.title = clean(patch.title);
  if (patch.kind && GUARDRAIL_KINDS.includes(patch.kind)) next.kind = patch.kind;
  if (patch.state && GUARDRAIL_STATES.includes(patch.state)) next.state = patch.state;
  next.updatedAt = timestamp;
  return next;
}

export function archiveProject(project, timestamp = now()) {
  if (!project) throw new Error('ProZect is required.');
  if (project.lifecycle === 'archived') return clone(project);
  const next = bumpProjectRevision(project, timestamp);
  return { ...next, lifecycle: 'archived', archivedAt: timestamp };
}

export function restoreProject(project, timestamp = now()) {
  if (!project || project.lifecycle !== 'archived') throw new Error('Only archived ProZects can be restored.');
  const next = bumpProjectRevision(project, timestamp);
  return { ...next, lifecycle: 'active', archivedAt: null };
}

export function assertCanDelete(project, typedName, confirmationStep) {
  if (!project || project.lifecycle !== 'archived') throw new Error('A ProZect must be archived before it can be permanently deleted.');
  if (confirmationStep !== 'FINAL_DELETE') throw new Error('Final deletion confirmation is incomplete.');
  if (clean(typedName) !== project.name) throw new Error('ProZect name confirmation does not match.');
  return true;
}

function normalizeProjectRecord(p, timestamp) {
  const normalized = createProject({ ...p, lifecycle: p.lifecycle === 'archived' ? 'active' : p.lifecycle }, timestamp || p.createdAt);
  normalized.lifecycle = p.lifecycle === 'archived' ? 'archived' : normalized.lifecycle;
  normalized.archivedAt = p.archivedAt || null;
  normalized.completedAt = p.lifecycle === 'completed' ? (p.completedAt || p.updatedAt || timestamp) : null;
  normalized.updatedAt = p.updatedAt || timestamp || normalized.createdAt;
  normalized.revision = revision(p.revision);
  normalized.nextNeedId = clean(p.nextNeedId) || null;
  return normalized;
}

export function normalizePulseEntryRecord(e, timestamp) { return createPulseEntry(e.projectId, e, timestamp || e.occurredAt); }
export function normalizeNeedRecord(n, timestamp) { return createNeed(n.projectId, n, timestamp || n.createdAt); }
export function normalizeGuardrailRecord(g, timestamp) { return createGuardrail(g.projectId, g, timestamp || g.createdAt); }
export { normalizeProjectRecord };

export function makeBackup({ projects, entries, needs, guardrails, exportedAt = now() }) {
  return { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION, schemaVersion: SCHEMA_VERSION, exportedAt,
    data: { projects: clone(projects || []), pulseEntries: clone(entries || []), needs: clone(needs || []), guardrails: clone(guardrails || []) } };
}

export function makeProjectPack({ projects, entries, needs, guardrails, exportedAt = now(), label = '' }) {
  return { format: PROJECT_PACK_FORMAT, packVersion: PROJECT_PACK_VERSION, schemaVersion: SCHEMA_VERSION, exportedAt, label: clean(label), mergePolicy: 'newer-record-wins-no-deletes',
    data: { projects: clone(projects || []), pulseEntries: clone(entries || []), needs: clone(needs || []), guardrails: clone(guardrails || []) } };
}

function validateDataset(candidate, { format, versionKey, currentVersion, noun }) {
  if (!candidate || candidate.format !== format) throw new Error(`This is not a StateZect ${noun}.`);
  if (![1, currentVersion].includes(candidate[versionKey])) throw new Error(`Unsupported ${noun} version.`);
  if (![1, SCHEMA_VERSION].includes(candidate.schemaVersion)) throw new Error('Unsupported schema version.');
  if (!candidate.data || !Array.isArray(candidate.data.projects) || !Array.isArray(candidate.data.pulseEntries) || !Array.isArray(candidate.data.needs) || !Array.isArray(candidate.data.guardrails)) throw new Error(`${noun[0].toUpperCase()+noun.slice(1)} data is incomplete.`);
  const label = noun[0].toUpperCase()+noun.slice(1);
  const validTime = (value, field) => { if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${label} contains an invalid ${field} timestamp.`); return value; };

  const projectIds = new Set();
  const projects = candidate.data.projects.map(p => {
    if (!p?.id || projectIds.has(p.id)) throw new Error(`${label} contains invalid or duplicate ProZect IDs.`);
    projectIds.add(p.id); validTime(p.createdAt, 'ProZect created'); validTime(p.updatedAt, 'ProZect updated');
    return normalizeProjectRecord(p, p.createdAt);
  });

  const pulseIds = new Set();
  const pulseEntries = candidate.data.pulseEntries.map(e => {
    if (!e?.id || pulseIds.has(e.id)) throw new Error(`${label} contains invalid or duplicate History entry IDs.`);
    if (!projectIds.has(e.projectId)) throw new Error(`${label} contains an orphaned History entry.`);
    pulseIds.add(e.id); validTime(e.occurredAt, 'History');
    if (e.updatedAt) validTime(e.updatedAt, 'History updated');
    if (e.editedAt) validTime(e.editedAt, 'History edited');
    if (e.removedAt) validTime(e.removedAt, 'History removed');
    return normalizePulseEntryRecord(e, e.occurredAt);
  });

  const needIds = new Set();
  const needs = candidate.data.needs.map(n => {
    if (!n?.id || needIds.has(n.id)) throw new Error(`${label} contains invalid or duplicate Need IDs.`);
    if (!projectIds.has(n.projectId)) throw new Error(`${label} contains an orphaned Need.`);
    needIds.add(n.id); validTime(n.createdAt, 'Need created'); validTime(n.updatedAt, 'Need updated');
    if (n.resolvedAt) validTime(n.resolvedAt, 'Need resolved');
    return normalizeNeedRecord(n, n.createdAt);
  });

  const guardIds = new Set();
  const guardrails = candidate.data.guardrails.map(g => {
    if (!g?.id || guardIds.has(g.id)) throw new Error(`${label} contains invalid or duplicate Guardrail IDs.`);
    if (!projectIds.has(g.projectId)) throw new Error(`${label} contains an orphaned Guardrail.`);
    guardIds.add(g.id); validTime(g.createdAt, 'Guardrail created'); validTime(g.updatedAt, 'Guardrail updated');
    return normalizeGuardrailRecord(g, g.createdAt);
  });

  for (const p of projects) {
    const ownNeeds = needs.filter(n => n.projectId === p.id);
    let chosen = p.nextNeedId ? ownNeeds.find(n => n.id === p.nextNeedId && n.state !== 'done') : null;
    if (!chosen) chosen = ownNeeds.find(n => n.isNext && n.state !== 'done') || null;
    if (!chosen && p.nextSummary) chosen = ownNeeds.find(n => n.state !== 'done' && n.title === p.nextSummary) || null;
    p.nextNeedId = chosen?.id || null;
    p.nextSummary = chosen?.title || clean(p.nextSummary);
    for (const n of ownNeeds) n.isNext = Boolean(chosen && n.id === chosen.id);
  }

  const result = clone(candidate);
  result.schemaVersion = SCHEMA_VERSION;
  result[versionKey] = currentVersion;
  result.data = { projects, pulseEntries, needs, guardrails };
  return result;
}

export function validateBackup(candidate) { return validateDataset(candidate, { format: BACKUP_FORMAT, versionKey: 'backupVersion', currentVersion: BACKUP_VERSION, noun: 'backup' }); }
export function validateProjectPack(candidate) {
  const valid = validateDataset(candidate, { format: PROJECT_PACK_FORMAT, versionKey: 'packVersion', currentVersion: PROJECT_PACK_VERSION, noun: 'ProZect Pack' });
  if (valid.mergePolicy && valid.mergePolicy !== 'newer-record-wins-no-deletes') throw new Error('Unsupported ProZect Pack merge policy.');
  return valid;
}

export function buildProjectBrief(project, entries = [], needs = [], guardrails = [], mode = 'quick') {
  const visibleEntries = entries.filter(e => !e.removedAt).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  const openNeeds = needs.filter(n => n.state !== 'done');
  const next = openNeeds.find(n => n.id === project.nextNeedId) || openNeeds.find(n => n.isNext) || null;
  const activeGuardrails = guardrails.filter(g => g.state !== 'retired');
  const lines = [`${project.name} — ${mode === 'full' ? 'Full ProZect Brief' : 'Quick Brief'}`, `${PROJECT_TYPES[project.type]?.label || 'General'} · ${project.stage} · ${project.lifecycle}`];
  if (project.currentSummary) lines.push(`Current: ${project.currentSummary}`);
  lines.push(`Attention: ${project.attention.replaceAll('_',' ')}`);
  if (next) lines.push(`Next: ${next.title}`); else if (project.nextSummary) lines.push(`Next: ${project.nextSummary}`);
  if (project.type === 'software') {
    const cp = project.checkpoints || {};
    if (cp.published) lines.push(`Public/released: ${cp.published}`);
    if (cp.accepted) lines.push(`Accepted baseline: ${cp.accepted}`);
    if (cp.candidate) lines.push(`Current candidate: ${cp.candidate}`);
  }
  if (mode === 'quick') {
    const blockers = openNeeds.filter(n => n.state === 'waiting');
    if (blockers.length) lines.push(`Waiting: ${blockers.map(n=>n.title).join('; ')}`);
    const gates = activeGuardrails.filter(g => g.kind === 'gate');
    if (gates.length) lines.push(`Gates: ${gates.map(g=>`${g.title} (${g.state})`).join('; ')}`);
    if (visibleEntries[0]) lines.push(`Latest: ${visibleEntries[0].summary}`);
    return lines.join('\n');
  }
  lines.push('', `Open Needs (${openNeeds.length}):`);
  lines.push(...(openNeeds.length ? openNeeds.map(n => `- ${n.id === next?.id ? '[NEXT] ' : ''}${n.title}${n.state === 'waiting' ? ' [waiting]' : ''}`) : ['- None']));
  lines.push('', `Guardrails (${activeGuardrails.length}):`);
  lines.push(...(activeGuardrails.length ? activeGuardrails.map(g => `- ${g.kind}: ${g.title} [${g.state}]`) : ['- None']));
  lines.push('', 'Recent History:');
  lines.push(...(visibleEntries.slice(0, 8).length ? visibleEntries.slice(0,8).map(e => `- ${e.kind}: ${e.summary}${e.editedAt ? ' [Edited]' : ''}`) : ['- No history yet']));
  return lines.join('\n');
}

function parsePacketText(raw, noun = 'Packet') {
  let text = String(raw ?? '').replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error(`Paste or import a ${noun} first.`);

  const repairs = [];
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)];
  if (fenced.length > 1) throw new Error(`The ${noun} response contains multiple code blocks. Ask the ProZect chat to return one JSON object only.`);
  if (fenced.length === 1) {
    text = fenced[0][1].trim();
    repairs.push('markdown_fence');
  }

  try { return { data: JSON.parse(text), repairs }; } catch {}

  let out = '';
  let mode = null;
  let escaped = false;
  let smartQuoteRepair = false;
  let whitespaceRepair = false;
  const nextNonSpace = index => {
    for (let j = index + 1; j < text.length; j += 1) if (!/\s/u.test(text[j])) return text[j];
    return '';
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (mode === 'ascii') {
      out += ch;
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') mode = null;
      continue;
    }
    if (mode === 'smart') {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === '\\') { out += ch; escaped = true; continue; }
      if (ch === '”' && [':', ',', '}', ']', ''].includes(nextNonSpace(i))) {
        out += '"'; mode = null; smartQuoteRepair = true; continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') { out += ch; mode = 'ascii'; continue; }
    if (ch === '“') { out += '"'; mode = 'smart'; smartQuoteRepair = true; continue; }
    if (ch === '\u00A0' || ch === '\u202F') { out += ' '; whitespaceRepair = true; continue; }
    out += ch;
  }

  if (smartQuoteRepair) repairs.push('smart_quotes');
  if (whitespaceRepair) repairs.push('unicode_whitespace');
  try { return { data: JSON.parse(out), repairs }; }
  catch {
    throw new Error(`Could not parse ${noun} JSON. StateZect can repair one JSON code block and smart/curly JSON quotation marks, but the remaining content is malformed. Ask the ProZect chat to regenerate one valid JSON object only.`);
  }
}

export function parseProjectUpdatePacketText(raw) { return parsePacketText(raw, 'Update Packet'); }
export function parseProjectBootstrapPacketText(raw) { return parsePacketText(raw, 'Bootstrap Packet'); }

export function makeProjectUpdatePrompt(project, entries = [], needs = [], guardrails = []) {
  const context = {
    project: {
      id: project.id, revision: revision(project.revision), name: project.name, type: project.type, lifecycle: project.lifecycle,
      stage: project.stage, attention: project.attention, currentSummary: project.currentSummary, nextNeedId: project.nextNeedId,
      checkpoints: project.checkpoints
    },
    needs: needs.map(n => ({ id:n.id, title:n.title, state:n.state, isNext:n.id === project.nextNeedId })),
    guardrails: guardrails.map(g => ({ id:g.id, title:g.title, kind:g.kind, state:g.state })),
    recentPulseEntries: entries.filter(e=>!e.removedAt).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,12).map(e=>({ id:e.id, kind:e.kind, summary:e.summary, occurredAt:e.occurredAt }))
  };
  return `You are preparing a StateZect ProZect update from the authoritative current information in this ProZect/development/work conversation.\n\nReturn ONLY one valid JSON object. Do not wrap it in commentary or Markdown code fences. Use straight ASCII double quotation marks (") for every JSON key and string delimiter; never use typographic/smart/curly quotation marks. Use this contract:\n{\n  "format": "${UPDATE_PACKET_FORMAT}",\n  "version": ${UPDATE_PACKET_VERSION},\n  "packetId": "pkt_<new stable unique id>",\n  "projectId": "${project.id}",\n  "basedOnRevision": ${revision(project.revision)},\n  "changes": {\n    "project": { "stage": "optional", "lifecycle": "optional", "attention": "optional", "currentSummary": "optional", "checkpoints": {"published":"optional","accepted":"optional","candidate":"optional"} },\n    "pulseEntries": [{"id":"pulse_<stable unique id>","kind":"Milestone","summary":"...","detail":"optional","occurredAt":"ISO timestamp optional"}],\n    "needs": { "upsert": [{"id":"existing-or-new stable id","title":"...","state":"open|waiting|done"}], "resolve": ["existing need id"] },\n    "guardrails": { "upsert": [{"id":"existing-or-new stable id","title":"...","kind":"protect|gate|decision","state":"active|open|closed|retired"}], "retire": ["existing guardrail id"] },\n    "nextNeedId": "existing-or-new open need id, or null"\n  }\n}\n\nRules:\n- Use only changes supported by the authoritative ProZect context.\n- Preserve supplied stable IDs when updating/resolving known records.\n- Resolve superseded Needs instead of duplicating them.\n- Do not infer deletion from omission.\n- Do not modify unrelated records.\n- If a section has no changes, omit it or use an empty collection.\n- nextNeedId must reference an open/waiting Need after this packet is applied, or null.\n\nCURRENT STATEZECT PROZECT STATE:\n${JSON.stringify(context, null, 2)}`;
}

export function makeProjectBootstrapPrompt({ projectId, type = 'general', name = '' } = {}) {
  const chosenType = PROJECT_TYPES[type] ? type : 'general';
  const stableProjectId = clean(projectId);
  if (!stableProjectId) throw new Error('Bootstrap Prompt requires a stable ProZect ID.');
  const knownName = clean(name);
  const preset = PROJECT_TYPES[chosenType];
  return `You are preparing a StateZect bootstrap snapshot for an already-underway ProZect from the authoritative current information in this ProZect/work conversation.\n\nReturn ONLY one valid JSON object. Do not wrap it in commentary or Markdown code fences. Use straight ASCII double quotation marks (\") for every JSON key and string delimiter; never use typographic/smart/curly quotation marks.\n\nUse this contract:\n{\n  \"format\": \"${BOOTSTRAP_PACKET_FORMAT}\",\n  \"version\": ${BOOTSTRAP_PACKET_VERSION},\n  \"packetId\": \"pkt_<new stable unique id>\",\n  \"project\": {\n    \"id\": \"${stableProjectId}\",\n    \"name\": \"${knownName || 'authoritative ProZect name'}\",\n    \"type\": \"${chosenType}\",\n    \"description\": \"optional short description\",\n    \"lifecycle\": \"active|paused|completed\",\n    \"stage\": \"current stage\",\n    \"attention\": \"clear|needs_attention|blocked|waiting\",\n    \"currentSummary\": \"concise current situation\",\n    \"checkpoints\": {\"published\":\"software only, optional\",\"accepted\":\"software only, optional\",\"candidate\":\"software only, optional\"}\n  },\n  \"pulseEntries\": [{\"id\":\"pulse_<stable unique id>\",\"kind\":\"Past milestone\",\"summary\":\"useful historical milestone\",\"detail\":\"optional\",\"occurredAt\":\"ISO timestamp optional\"}],\n  \"needs\": [{\"id\":\"need_<stable unique id>\",\"title\":\"open requirement\",\"state\":\"open|waiting|done\"}],\n  \"nextNeedId\": \"one open/waiting Need id, or null\",\n  \"guardrails\": [{\"id\":\"guard_<stable unique id>\",\"title\":\"standing constraint/decision/gate\",\"kind\":\"protect|gate|decision\",\"state\":\"active|open|closed|retired\"}]\n}\n\nRules:\n- Use only truth supported by the authoritative ProZect context.\n- Capture the useful present state first; do not recreate every historical conversation or minor event.\n- Include only meaningful past milestones that help orient future work.\n- Keep Needs concise and actionable; identify one Next only when the ProZect has a clear next action.\n- Guardrails are things that must remain explicit, not ordinary tasks.\n- Do not archive the ProZect in a Bootstrap Packet.\n- All IDs must be stable and unique.\n- The ProZect ID must remain exactly ${stableProjectId}.\n- The ProZect type must remain exactly ${chosenType} (${preset.label}).\n${knownName ? `- The ProZect name must remain exactly ${knownName}.\n` : ''}- If the type is not software, leave software checkpoints empty.\n- If information is unknown, omit optional detail rather than inventing it.`;
}

export function validateProjectBootstrapPacket(candidate) {
  if (!candidate || candidate.format !== BOOTSTRAP_PACKET_FORMAT) throw new Error('This is not a StateZect ProZect Bootstrap Packet.');
  if (candidate.version !== BOOTSTRAP_PACKET_VERSION) throw new Error('Unsupported ProZect Bootstrap Packet version.');
  if (!validPacketId(candidate.packetId)) throw new Error('Bootstrap Packet is missing a valid packet ID.');
  const rawProject = candidate.project || {};
  if (!validPacketId(rawProject.id)) throw new Error('Bootstrap Packet is missing a valid ProZect ID.');
  if (!clean(rawProject.name)) throw new Error('Bootstrap Packet ProZect name is required.');
  if (!PROJECT_TYPES[rawProject.type]) throw new Error('Bootstrap Packet contains an invalid ProZect type.');
  if (rawProject.lifecycle === 'archived') throw new Error('Bootstrap Packets cannot create archived ProZects. Create the ProZect first, then use the StateZect Archive flow if needed.');
  if (rawProject.lifecycle && !LIFECYCLES.includes(rawProject.lifecycle)) throw new Error('Bootstrap Packet contains an invalid lifecycle.');
  if (rawProject.attention && !ATTENTION_STATES.includes(rawProject.attention)) throw new Error('Bootstrap Packet contains an invalid attention state.');
  if (rawProject.checkpoints && (typeof rawProject.checkpoints !== 'object' || Array.isArray(rawProject.checkpoints))) throw new Error('Bootstrap Packet checkpoints are invalid.');
  if (rawProject.checkpoints) for (const key of Object.keys(rawProject.checkpoints)) if (!['published','accepted','candidate'].includes(key)) throw new Error(`Unsupported checkpoint field: ${key}`);
  if (rawProject.type !== 'software' && rawProject.checkpoints && Object.values(rawProject.checkpoints).some(v=>clean(v))) throw new Error('Non-software Bootstrap Packets cannot set software checkpoints.');
  const timestamp = now();
  let project = createProject({ ...rawProject, id:rawProject.id, revision:1 }, timestamp);

  const pulseEntries = Array.isArray(candidate.pulseEntries) ? candidate.pulseEntries : [];
  const pulseIds = new Set();
  const normalizedEntries = pulseEntries.map(e=>{
    if (!validPacketId(e?.id) || pulseIds.has(e.id)) throw new Error('Bootstrap Packet contains invalid or duplicate History entry IDs.');
    pulseIds.add(e.id); if (!clean(e.summary)) throw new Error('Bootstrap Packet History entries require a summary.');
    if (e.occurredAt && Number.isNaN(Date.parse(e.occurredAt))) throw new Error('Bootstrap Packet contains an invalid History timestamp.');
    return createPulseEntry(project.id,{...e,id:e.id},e.occurredAt||timestamp);
  });

  const rawNeeds = Array.isArray(candidate.needs) ? candidate.needs : [];
  const needIds = new Set();
  let needs = rawNeeds.map(n=>{
    if (!validPacketId(n?.id) || needIds.has(n.id)) throw new Error('Bootstrap Packet contains invalid or duplicate Need IDs.');
    needIds.add(n.id); if (!clean(n.title)) throw new Error('Bootstrap Packet Needs require a title.');
    if (n.state && !NEED_STATES.includes(n.state)) throw new Error('Bootstrap Packet contains an invalid Need state.');
    return createNeed(project.id,{...n,id:n.id,isNext:false},timestamp);
  });

  const rawGuardrails = Array.isArray(candidate.guardrails) ? candidate.guardrails : [];
  const guardIds = new Set();
  const guardrails = rawGuardrails.map(g=>{
    if (!validPacketId(g?.id) || guardIds.has(g.id)) throw new Error('Bootstrap Packet contains invalid or duplicate Guardrail IDs.');
    guardIds.add(g.id); if (!clean(g.title)) throw new Error('Bootstrap Packet Guardrails require a title.');
    if (g.kind && !GUARDRAIL_KINDS.includes(g.kind)) throw new Error('Bootstrap Packet contains an invalid Guardrail kind.');
    if (g.state && !GUARDRAIL_STATES.includes(g.state)) throw new Error('Bootstrap Packet contains an invalid Guardrail state.');
    return createGuardrail(project.id,{...g,id:g.id},timestamp);
  });

  const nextNeedId = candidate.nextNeedId === null || candidate.nextNeedId === undefined ? null : clean(candidate.nextNeedId);
  if (nextNeedId) {
    const next = needs.find(n=>n.id===nextNeedId);
    if (!next) throw new Error('Bootstrap Packet Next Need does not exist in the packet.');
    if (next.state === 'done') throw new Error('Bootstrap Packet cannot make a completed Need the Next Need.');
    const rel = setProjectNext(project,needs,nextNeedId,timestamp); project=rel.project; needs=rel.needs;
  }
  return { format:BOOTSTRAP_PACKET_FORMAT, version:BOOTSTRAP_PACKET_VERSION, packetId:clean(candidate.packetId), project, pulseEntries:normalizedEntries, needs, nextNeedId:project.nextNeedId, guardrails };
}

export function previewProjectBootstrapPacket(candidate) {
  const packet = validateProjectBootstrapPacket(candidate);
  const next = packet.nextNeedId ? packet.needs.find(n=>n.id===packet.nextNeedId) : null;
  const lines = [
    `Create ProZect: ${packet.project.name}`,
    `Type / stage: ${PROJECT_TYPES[packet.project.type].label} · ${packet.project.stage}`,
    `Lifecycle / attention: ${packet.project.lifecycle} · ${packet.project.attention.replaceAll('_',' ')}`
  ];
  if (packet.project.currentSummary) lines.push(`Current: ${packet.project.currentSummary}`);
  if (packet.pulseEntries.length) lines.push(`Import ${packet.pulseEntries.length} useful history entr${packet.pulseEntries.length===1?'y':'ies'}`);
  if (packet.needs.length) lines.push(`Import ${packet.needs.length} Need${packet.needs.length===1?'':'s'}`);
  if (next) lines.push(`Next: ${next.title}`);
  if (packet.guardrails.length) lines.push(`Import ${packet.guardrails.length} Guardrail${packet.guardrails.length===1?'':'s'}`);
  if (packet.project.type === 'software') {
    const cp=packet.project.checkpoints||{};
    if (cp.published) lines.push(`Public/released: ${cp.published}`);
    if (cp.accepted) lines.push(`Accepted baseline: ${cp.accepted}`);
    if (cp.candidate) lines.push(`Current candidate: ${cp.candidate}`);
  }
  return { packet, lines };
}

function validPacketId(value) { return typeof value === 'string' && value.trim().length >= 4; }
export function validateProjectUpdatePacket(candidate) {
  if (!candidate || candidate.format !== UPDATE_PACKET_FORMAT) throw new Error('This is not a StateZect ProZect Update Packet.');
  if (candidate.version !== UPDATE_PACKET_VERSION) throw new Error('Unsupported ProZect Update Packet version.');
  if (!validPacketId(candidate.packetId)) throw new Error('Update Packet is missing a valid packet ID.');
  if (!clean(candidate.projectId)) throw new Error('Update Packet is missing a ProZect ID.');
  if (!Number.isInteger(candidate.basedOnRevision) || candidate.basedOnRevision < 1) throw new Error('Update Packet is missing a valid base revision.');
  const changes = candidate.changes || {};
  const project = changes.project || {};
  for (const key of Object.keys(project)) if (!['stage','lifecycle','attention','currentSummary','checkpoints'].includes(key)) throw new Error(`Unsupported ProZect patch field: ${key}`);
  if (project.lifecycle && !LIFECYCLES.includes(project.lifecycle)) throw new Error('Update Packet contains an invalid lifecycle.');
  if (project.lifecycle === 'archived') throw new Error('Update Packets cannot archive ProZects. Use the StateZect Archive flow instead.');
  if (project.attention && !ATTENTION_STATES.includes(project.attention)) throw new Error('Update Packet contains an invalid attention state.');
  if (project.checkpoints && (typeof project.checkpoints !== 'object' || Array.isArray(project.checkpoints))) throw new Error('Update Packet checkpoints are invalid.');
  if (project.checkpoints) for (const key of Object.keys(project.checkpoints)) if (!['published','accepted','candidate'].includes(key)) throw new Error(`Unsupported checkpoint field: ${key}`);
  const pulseEntries = Array.isArray(changes.pulseEntries) ? changes.pulseEntries : [];
  const pulseIds = new Set();
  for (const e of pulseEntries) {
    if (!validPacketId(e?.id) || pulseIds.has(e.id)) throw new Error('Update Packet contains invalid or duplicate History entry IDs.');
    pulseIds.add(e.id); if (!clean(e.summary)) throw new Error('Update Packet History entries require a summary.');
    if (e.occurredAt && Number.isNaN(Date.parse(e.occurredAt))) throw new Error('Update Packet contains an invalid History timestamp.');
  }
  const needs = changes.needs || {};
  const needUpsert = Array.isArray(needs.upsert) ? needs.upsert : [];
  const needIds = new Set();
  for (const n of needUpsert) {
    if (!validPacketId(n?.id) || needIds.has(n.id)) throw new Error('Update Packet contains invalid or duplicate Need IDs.');
    needIds.add(n.id); if (!clean(n.title)) throw new Error('Update Packet Need upserts require a title.');
    if (n.state && !NEED_STATES.includes(n.state)) throw new Error('Update Packet contains an invalid Need state.');
  }
  const resolve = Array.isArray(needs.resolve) ? needs.resolve.map(clean).filter(Boolean) : [];
  if (resolve.some(id => needIds.has(id))) throw new Error('Update Packet cannot both upsert and resolve the same Need.');
  const guardrails = changes.guardrails || {};
  const guardUpsert = Array.isArray(guardrails.upsert) ? guardrails.upsert : [];
  const guardIds = new Set();
  for (const g of guardUpsert) {
    if (!validPacketId(g?.id) || guardIds.has(g.id)) throw new Error('Update Packet contains invalid or duplicate Guardrail IDs.');
    guardIds.add(g.id); if (!clean(g.title)) throw new Error('Update Packet Guardrail upserts require a title.');
    if (g.kind && !GUARDRAIL_KINDS.includes(g.kind)) throw new Error('Update Packet contains an invalid Guardrail kind.');
    if (g.state && !GUARDRAIL_STATES.includes(g.state)) throw new Error('Update Packet contains an invalid Guardrail state.');
  }
  const retire = Array.isArray(guardrails.retire) ? guardrails.retire.map(clean).filter(Boolean) : [];
  if (retire.some(id => guardIds.has(id))) throw new Error('Update Packet cannot both upsert and retire the same Guardrail.');
  const normalized = clone(candidate);
  normalized.changes = {
    ...(Object.keys(project).length ? { project: clone(project) } : {}),
    pulseEntries: clone(pulseEntries),
    needs: { upsert: clone(needUpsert), resolve },
    guardrails: { upsert: clone(guardUpsert), retire },
    ...(Object.prototype.hasOwnProperty.call(changes,'nextNeedId') ? { nextNeedId: changes.nextNeedId === null ? null : (clean(changes.nextNeedId) || null) } : {})
  };
  return normalized;
}

export function previewProjectUpdatePacket(packet, project, needs = [], guardrails = []) {
  const valid = validateProjectUpdatePacket(packet);
  if (valid.projectId !== project.id) throw new Error('Update Packet targets a different ProZect.');
  const lines = [];
  const patch = valid.changes.project || {};
  for (const key of ['stage','lifecycle','attention','currentSummary']) if (patch[key] !== undefined && String(project[key] ?? '') !== String(patch[key])) lines.push(`${key}: ${project[key] || '—'} → ${patch[key] || '—'}`);
  if (patch.checkpoints) for (const key of ['published','accepted','candidate']) if (patch.checkpoints[key] !== undefined && String(project.checkpoints?.[key] || '') !== String(patch.checkpoints[key] || '')) lines.push(`${key} checkpoint: ${project.checkpoints?.[key] || '—'} → ${patch.checkpoints[key] || '—'}`);
  if (valid.changes.pulseEntries.length) lines.push(`Add ${valid.changes.pulseEntries.length} History entr${valid.changes.pulseEntries.length===1?'y':'ies'}`);
  if (valid.changes.needs.resolve.length) lines.push(`Resolve ${valid.changes.needs.resolve.length} Need${valid.changes.needs.resolve.length===1?'':'s'}`);
  if (valid.changes.needs.upsert.length) lines.push(`Add/update ${valid.changes.needs.upsert.length} Need${valid.changes.needs.upsert.length===1?'':'s'}`);
  if (valid.changes.guardrails.retire.length) lines.push(`Retire ${valid.changes.guardrails.retire.length} Guardrail${valid.changes.guardrails.retire.length===1?'':'s'}`);
  if (valid.changes.guardrails.upsert.length) lines.push(`Add/update ${valid.changes.guardrails.upsert.length} Guardrail${valid.changes.guardrails.upsert.length===1?'':'s'}`);
  if (Object.prototype.hasOwnProperty.call(valid.changes,'nextNeedId')) {
    const after = valid.changes.nextNeedId ? (valid.changes.needs.upsert.find(n=>n.id===valid.changes.nextNeedId)?.title || needs.find(n=>n.id===valid.changes.nextNeedId)?.title || valid.changes.nextNeedId) : 'None';
    lines.push(`Next: ${after}`);
  }
  return { packet: valid, stale: valid.basedOnRevision !== revision(project.revision), currentRevision: revision(project.revision), lines: lines.length ? lines : ['No effective changes described.'] };
}
