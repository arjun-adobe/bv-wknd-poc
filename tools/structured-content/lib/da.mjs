// DA source, AEM admin (preview/publish) and structured content delivery helpers.
// Credentials: none are handled here; requests rely on whatever auth the
// environment injects for admin.da.live / admin.hlx.page.

export const ORG = 'arjun-adobe';
export const SITE = 'bv-wknd-poc';
export const REF = 'main';

const DA_ADMIN = 'https://admin.da.live';
const AEM_ADMIN = 'https://admin.hlx.page';
const SC_DELIVERY = 'https://da-sc.adobeaem.workers.dev';

/** Deep-compare two values, ignoring object key order. */
const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  }
  return v;
};
export const sameData = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** DA source document text, or null when it doesn't exist. */
export async function getSource(path) {
  const res = await fetch(`${DA_ADMIN}/source/${ORG}/${SITE}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`DA GET ${path}: HTTP ${res.status}`);
  return res.text();
}

/** Save a DA source document (html, json, ...). Returns the HTTP status. */
export async function putSource(path, content, type = 'text/html') {
  const body = new FormData();
  body.append('data', new Blob([content], { type }));
  const res = await fetch(`${DA_ADMIN}/source/${ORG}/${SITE}${path}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`DA POST ${path}: HTTP ${res.status}`);
  return res.status;
}

/** Names of the documents in a DA folder. */
export async function listFolder(path) {
  const res = await fetch(`${DA_ADMIN}/list/${ORG}/${SITE}${path}`);
  if (!res.ok) throw new Error(`DA list ${path}: HTTP ${res.status}`);
  return (await res.json()).filter((e) => e.ext).map((e) => e.name).sort();
}

/** Preview (and optionally publish) a web path, e.g. /adventures-data/bali-surf-camp. */
export async function previewAndPublish(webPath, { publish = true } = {}) {
  const run = async (op) => (await fetch(`${AEM_ADMIN}/${op}/${ORG}/${SITE}/${REF}${webPath}`, { method: 'POST' })).status;
  const preview = await run('preview');
  const live = publish ? await run('live') : null;
  return { preview, live };
}

/** Delivered structured content JSON ({ metadata, data }) for preview or live. */
export async function getDelivered(path, env = 'live') {
  const res = await fetch(`${SC_DELIVERY}/${env}/${ORG}/${SITE}${path}?cb=${Date.now()}`);
  if (!res.ok) return null;
  return res.json();
}
