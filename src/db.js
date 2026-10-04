import {
  SCHEMA_VERSION, validateBackup, validateProjectPack, validateProjectUpdatePacket, validateProjectBootstrapPacket,
  normalizeProjectRecord, normalizePulseEntryRecord, normalizeNeedRecord, normalizeGuardrailRecord,
  createPulseEntry, createNeed, updateNeed, createGuardrail, updateGuardrail
} from './domain.js?v=statezect-public-v1-0-0';

const DB_NAME = 'nivareq-pulse';
const DB_VERSION = 2;
let dbPromise;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pulseEntries')) {
        const store = db.createObjectStore('pulseEntries', { keyPath: 'id' });
        store.createIndex('by_project', 'projectId'); store.createIndex('by_time', 'occurredAt');
      }
      if (!db.objectStoreNames.contains('needs')) { const store = db.createObjectStore('needs', { keyPath: 'id' }); store.createIndex('by_project', 'projectId'); }
      if (!db.objectStoreNames.contains('guardrails')) { const store = db.createObjectStore('guardrails', { keyPath: 'id' }); store.createIndex('by_project', 'projectId'); }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function req(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function tx(storeNames, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const stores = Object.fromEntries(storeNames.map(name => [name, transaction.objectStore(name)]));
    let result;
    Promise.resolve().then(() => work(stores)).then(value => { result = value; }).catch(err => { try { transaction.abort(); } catch {} reject(err); });
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Database transaction aborted.'));
  });
}

export async function ensureMeta() {
  await tx(['projects','pulseEntries','needs','guardrails','meta'], 'readwrite', async stores => {
    const existing = await req(stores.meta.get('schemaVersion'));
    const current = Number(existing?.value || 1);
    if (current > SCHEMA_VERSION) throw new Error('StateZect data was created by a newer unsupported schema.');
    if (current < 2) {
      const projects = await req(stores.projects.getAll());
      const entries = await req(stores.pulseEntries.getAll());
      const needs = await req(stores.needs.getAll());
      const guardrails = await req(stores.guardrails.getAll());
      const normalizedNeeds = needs.map(n => normalizeNeedRecord(n, n.createdAt));
      for (const n of normalizedNeeds) stores.needs.put(n);
      for (const e of entries) stores.pulseEntries.put(normalizePulseEntryRecord(e, e.occurredAt));
      for (const g of guardrails) stores.guardrails.put(normalizeGuardrailRecord(g, g.createdAt));
      for (const p of projects) {
        const next = normalizeProjectRecord(p, p.createdAt);
        const own = normalizedNeeds.filter(n => n.projectId === p.id && n.state !== 'done');
        const chosen = own.find(n => n.id === p.nextNeedId) || own.find(n => n.isNext) || own.find(n => n.title === p.nextSummary) || null;
        next.nextNeedId = chosen?.id || null;
        next.nextSummary = chosen?.title || p.nextSummary || '';
        for (const n of own) { const selected = n.id === next.nextNeedId; if (n.isNext !== selected) stores.needs.put({ ...n, isNext:selected }); }
        stores.projects.put(next);
      }
    }
    stores.meta.put({ key:'schemaVersion', value:SCHEMA_VERSION });
  });
}

export const listProjects = () => tx(['projects'], 'readonly', async ({ projects }) => req(projects.getAll()));
export const putProject = project => tx(['projects'], 'readwrite', async ({ projects }) => { projects.put(project); });
export const getProject = id => tx(['projects'], 'readonly', async ({ projects }) => req(projects.get(id)));
export async function savePulse(project, entry) { return tx(['projects','pulseEntries'],'readwrite', async stores => { stores.projects.put(project); stores.pulseEntries.put(entry); }); }
export async function savePulseAndNeeds(project, entry, needs) { return tx(['projects','pulseEntries','needs'],'readwrite', async stores => { stores.projects.put(project); stores.pulseEntries.put(entry); for (const n of needs) stores.needs.put(n); }); }
export async function saveProjectBootstrap(project, entries = [], needs = [], guardrails = []) { return tx(['projects','pulseEntries','needs','guardrails'],'readwrite', async stores => { stores.projects.put(project); for (const entry of entries) stores.pulseEntries.put(entry); for (const n of needs) stores.needs.put(n); for (const g of guardrails) stores.guardrails.put(g); }); }
export const putPulseEntry = entry => tx(['pulseEntries'],'readwrite', async ({pulseEntries}) => { pulseEntries.put(entry); });
export const deletePulseEntry = id => tx(['pulseEntries'],'readwrite', async ({pulseEntries}) => { pulseEntries.delete(id); });
export async function deletePulseEntryAndSaveProject(project, entryId) { return tx(['projects','pulseEntries'],'readwrite', async stores => { stores.projects.put(project); stores.pulseEntries.delete(entryId); }); }
export async function listEntries(projectId = null) { return tx(['pulseEntries'],'readonly', async ({pulseEntries}) => { const rows = projectId ? await req(pulseEntries.index('by_project').getAll(projectId)) : await req(pulseEntries.getAll()); return rows.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)); }); }
export async function listNeeds(projectId = null) { return tx(['needs'],'readonly', async ({needs}) => projectId ? req(needs.index('by_project').getAll(projectId)) : req(needs.getAll())); }
export const putNeed = need => tx(['needs'],'readwrite', async ({needs}) => { needs.put(need); });
export async function saveProjectAndNeeds(project, needs) { return tx(['projects','needs'],'readwrite', async stores => { stores.projects.put(project); for (const n of needs) stores.needs.put(n); }); }
export async function deleteNeedAndSaveProject(project, needId, needs = []) { return tx(['projects','needs'],'readwrite', async stores => { stores.projects.put(project); for (const n of needs) stores.needs.put(n); stores.needs.delete(needId); }); }
export async function listGuardrails(projectId = null) { return tx(['guardrails'],'readonly', async ({guardrails}) => projectId ? req(guardrails.index('by_project').getAll(projectId)) : req(guardrails.getAll())); }
export const putGuardrail = guardrail => tx(['guardrails'],'readwrite', async ({guardrails}) => { guardrails.put(guardrail); });
export async function saveProjectAndGuardrail(project, guardrail) { return tx(['projects','guardrails'],'readwrite', async stores => { stores.projects.put(project); stores.guardrails.put(guardrail); }); }

export async function deleteProjectCascade(projectId) {
  return tx(['projects','pulseEntries','needs','guardrails'],'readwrite', async stores => {
    stores.projects.delete(projectId);
    for (const row of await req(stores.pulseEntries.index('by_project').getAll(projectId))) stores.pulseEntries.delete(row.id);
    for (const row of await req(stores.needs.index('by_project').getAll(projectId))) stores.needs.delete(row.id);
    for (const row of await req(stores.guardrails.index('by_project').getAll(projectId))) stores.guardrails.delete(row.id);
  });
}

export async function resetAllData() {
  return tx(['projects','pulseEntries','needs','guardrails','meta'],'readwrite', async stores => {
    stores.projects.clear(); stores.pulseEntries.clear(); stores.needs.clear(); stores.guardrails.clear(); stores.meta.clear(); stores.meta.put({ key:'schemaVersion', value:SCHEMA_VERSION });
  });
}

export async function replaceAllFromBackup(candidate) {
  const valid = validateBackup(candidate);
  return tx(['projects','pulseEntries','needs','guardrails','meta'],'readwrite', async stores => {
    stores.projects.clear(); stores.pulseEntries.clear(); stores.needs.clear(); stores.guardrails.clear();
    for (const p of valid.data.projects) stores.projects.put(p);
    for (const e of valid.data.pulseEntries) stores.pulseEntries.put(e);
    for (const n of valid.data.needs) stores.needs.put(n);
    for (const g of valid.data.guardrails) stores.guardrails.put(g);
    stores.meta.put({ key:'schemaVersion', value:SCHEMA_VERSION });
  });
}

function incomingIsNewer(incoming, existing) {
  if (!existing) return true;
  const a = Date.parse(incoming?.updatedAt || incoming?.occurredAt || incoming?.createdAt || 0);
  const b = Date.parse(existing?.updatedAt || existing?.occurredAt || existing?.createdAt || 0);
  if (Number.isNaN(a)) return false; if (Number.isNaN(b)) return true; return a > b;
}

export async function mergeProjectPack(candidate) {
  const valid = validateProjectPack(candidate);
  return tx(['projects','pulseEntries','needs','guardrails'],'readwrite', async stores => {
    const result = { projectsAdded:0, projectsUpdated:0, projectsKept:0, entriesAdded:0, entriesUpdated:0, needsAdded:0, needsUpdated:0, guardrailsAdded:0, guardrailsUpdated:0 };
    const projectMutated = new Set();
    const childTouched = new Set();
    const timestamp = new Date().toISOString();
    for (const incoming of valid.data.projects) {
      const existing=await req(stores.projects.get(incoming.id));
      if(!existing){stores.projects.put(incoming);result.projectsAdded++;projectMutated.add(incoming.id);}
      else if(incomingIsNewer(incoming,existing)){
        const merged={...incoming,revision:Math.max(Number(incoming.revision||1),Number(existing.revision||1)+1)};
        stores.projects.put(merged);result.projectsUpdated++;projectMutated.add(incoming.id);
      } else result.projectsKept++;
    }
    for (const incoming of valid.data.pulseEntries) {
      const existing=await req(stores.pulseEntries.get(incoming.id));
      if(!existing){stores.pulseEntries.put(incoming);result.entriesAdded++;childTouched.add(incoming.projectId);}
      else if(incomingIsNewer(incoming,existing)){stores.pulseEntries.put(incoming);result.entriesUpdated++;childTouched.add(incoming.projectId);}
    }
    for (const incoming of valid.data.needs) {
      const existing=await req(stores.needs.get(incoming.id));
      if(!existing){stores.needs.put(incoming);result.needsAdded++;childTouched.add(incoming.projectId);}
      else if(incomingIsNewer(incoming,existing)){stores.needs.put(incoming);result.needsUpdated++;childTouched.add(incoming.projectId);}
    }
    for (const incoming of valid.data.guardrails) {
      const existing=await req(stores.guardrails.get(incoming.id));
      if(!existing){stores.guardrails.put(incoming);result.guardrailsAdded++;childTouched.add(incoming.projectId);}
      else if(incomingIsNewer(incoming,existing)){stores.guardrails.put(incoming);result.guardrailsUpdated++;childTouched.add(incoming.projectId);}
    }
    for (const projectId of childTouched) {
      if (projectMutated.has(projectId)) continue;
      const project=await req(stores.projects.get(projectId));
      if(!project) continue;
      const ownNeeds=await req(stores.needs.index('by_project').getAll(projectId));
      const next=project.nextNeedId ? ownNeeds.find(n=>n.id===project.nextNeedId&&n.state!=='done') : null;
      const refreshed={...project,revision:Number(project.revision||1)+1,updatedAt:timestamp};
      if(project.nextNeedId&&!next){refreshed.nextNeedId=null;refreshed.nextSummary='';}
      stores.projects.put(refreshed);
    }
    return result;
  });
}

export async function applyProjectBootstrapPacket(candidate) {
  const packet = validateProjectBootstrapPacket(candidate);
  return tx(['projects','pulseEntries','needs','guardrails','meta'],'readwrite', async stores => {
    if (await req(stores.meta.get(`packet:${packet.packetId}`))) throw new Error('This Bootstrap Packet has already been applied.');
    if (await req(stores.projects.get(packet.project.id))) throw new Error('A ProZect with this stable ProZect ID already exists in StateZect.');
    stores.projects.put(packet.project);
    for (const entry of packet.pulseEntries) stores.pulseEntries.put(entry);
    for (const need of packet.needs) stores.needs.put(need);
    for (const guardrail of packet.guardrails) stores.guardrails.put(guardrail);
    stores.meta.put({ key:`packet:${packet.packetId}`, value:{ appliedAt:new Date().toISOString(), projectId:packet.project.id, kind:'bootstrap', resultingRevision:packet.project.revision } });
    return { project:packet.project, entriesAdded:packet.pulseEntries.length, needsAdded:packet.needs.length, guardrailsAdded:packet.guardrails.length };
  });
}

export async function isPacketApplied(packetId) { return tx(['meta'],'readonly', async ({meta}) => Boolean(await req(meta.get(`packet:${packetId}`)))); }

export async function applyProjectUpdatePacket(candidate, { allowStale = false } = {}) {
  const packet = validateProjectUpdatePacket(candidate);
  return tx(['projects','pulseEntries','needs','guardrails','meta'],'readwrite', async stores => {
    if (await req(stores.meta.get(`packet:${packet.packetId}`))) throw new Error('This Update Packet has already been applied.');
    let project = await req(stores.projects.get(packet.projectId));
    if (!project) throw new Error('The target ProZect does not exist in StateZect.');
    const currentRevision = Number(project.revision || 1);
    if (packet.basedOnRevision !== currentRevision && !allowStale) throw new Error(`This packet was prepared from revision ${packet.basedOnRevision}, but the ProZect is now revision ${currentRevision}.`);
    const timestamp = new Date().toISOString();
    const patch = packet.changes.project || {};
    project = normalizeProjectRecord(project, project.createdAt);
    if (patch.stage !== undefined) project.stage = String(patch.stage).trim() || project.stage;
    if (patch.lifecycle !== undefined) project.lifecycle = patch.lifecycle;
    if (patch.attention !== undefined) project.attention = patch.attention;
    if (patch.currentSummary !== undefined) project.currentSummary = String(patch.currentSummary).trim();
    if (patch.checkpoints) project.checkpoints = { ...project.checkpoints, ...Object.fromEntries(Object.entries(patch.checkpoints).filter(([k])=>['published','accepted','candidate'].includes(k)).map(([k,v])=>[k,String(v??'').trim()])) };

    let ownNeeds = await req(stores.needs.index('by_project').getAll(project.id));
    for (const needId of packet.changes.needs.resolve) {
      const existing = ownNeeds.find(n=>n.id===needId); if (!existing) throw new Error(`Cannot resolve unknown Need: ${needId}`);
      const updated = updateNeed(existing,{state:'done',isNext:false},timestamp); stores.needs.put(updated); ownNeeds = ownNeeds.map(n=>n.id===needId?updated:n);
    }
    for (const incoming of packet.changes.needs.upsert) {
      const existing = ownNeeds.find(n=>n.id===incoming.id);
      const updated = existing ? updateNeed(existing,{title:incoming.title,state:incoming.state||existing.state},timestamp) : createNeed(project.id,{id:incoming.id,title:incoming.title,state:incoming.state||'open'},timestamp);
      stores.needs.put(updated); ownNeeds = existing ? ownNeeds.map(n=>n.id===incoming.id?updated:n) : [...ownNeeds,updated];
    }

    let ownGuardrails = await req(stores.guardrails.index('by_project').getAll(project.id));
    for (const guardId of packet.changes.guardrails.retire) {
      const existing = ownGuardrails.find(g=>g.id===guardId); if (!existing) throw new Error(`Cannot retire unknown Guardrail: ${guardId}`);
      const updated = updateGuardrail(existing,{state:'retired'},timestamp); stores.guardrails.put(updated); ownGuardrails=ownGuardrails.map(g=>g.id===guardId?updated:g);
    }
    for (const incoming of packet.changes.guardrails.upsert) {
      const existing = ownGuardrails.find(g=>g.id===incoming.id);
      const updated = existing ? updateGuardrail(existing,{title:incoming.title,kind:incoming.kind||existing.kind,state:incoming.state||existing.state},timestamp) : createGuardrail(project.id,{id:incoming.id,title:incoming.title,kind:incoming.kind||'protect',state:incoming.state},timestamp);
      stores.guardrails.put(updated); ownGuardrails = existing ? ownGuardrails.map(g=>g.id===incoming.id?updated:g) : [...ownGuardrails,updated];
    }

    let entriesAdded = 0;
    for (const incoming of packet.changes.pulseEntries) {
      if (await req(stores.pulseEntries.get(incoming.id))) continue;
      stores.pulseEntries.put(createPulseEntry(project.id,{...incoming,id:incoming.id},incoming.occurredAt||timestamp)); entriesAdded++;
    }

    if (Object.prototype.hasOwnProperty.call(packet.changes,'nextNeedId')) {
      const nextId = packet.changes.nextNeedId;
      let selected = null;
      if (nextId) {
        selected = ownNeeds.find(n=>n.id===nextId); if (!selected) throw new Error(`Next Need does not exist after packet apply: ${nextId}`);
        if (selected.state === 'done') throw new Error('Update Packet cannot make a completed Need the Next Need.');
      }
      for (const n of ownNeeds) { const flag=Boolean(selected&&n.id===selected.id); if(n.isNext!==flag){const updated=updateNeed(n,{isNext:flag},timestamp);stores.needs.put(updated);ownNeeds=ownNeeds.map(x=>x.id===n.id?updated:x);} }
      project.nextNeedId = selected?.id || null; project.nextSummary = selected?.title || '';
    } else if (project.nextNeedId) {
      const still = ownNeeds.find(n=>n.id===project.nextNeedId && n.state!=='done');
      if (!still) { project.nextNeedId=null; project.nextSummary=''; }
    }

    project.revision = currentRevision + 1;
    project.updatedAt = timestamp;
    if (project.lifecycle === 'completed' && !project.completedAt) project.completedAt = timestamp;
    if (project.lifecycle !== 'completed') project.completedAt = null;
    stores.projects.put(project);
    stores.meta.put({ key:`packet:${packet.packetId}`, value:{ appliedAt:timestamp, projectId:project.id, basedOnRevision:packet.basedOnRevision, resultingRevision:project.revision } });
    return { project, entriesAdded, needsTouched:packet.changes.needs.resolve.length+packet.changes.needs.upsert.length, guardrailsTouched:packet.changes.guardrails.retire.length+packet.changes.guardrails.upsert.length, stale:packet.basedOnRevision!==currentRevision };
  });
}

export async function readAll() {
  const [projects,pulseEntries,needs,guardrails] = await Promise.all([listProjects(),listEntries(),listNeeds(),listGuardrails()]);
  return { projects, pulseEntries, needs, guardrails };
}
