import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOST = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home|.*\.lan)$/i;
const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.168\./,
  /^198\.(18|19)\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^2(2[4-9]|3\d|4\d|5[0-5])\./,
];

function ipv4IsPrivate(ip) {
  return PRIVATE_V4.some((pattern) => pattern.test(ip));
}

function ipv6IsPrivate(ip) {
  const value = ip.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('::ffff:')) return ipv4IsPrivate(value.slice(7));
  if (/^f[cd][0-9a-f]{2}:/.test(value)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(value)) return true;
  if (/^ff[0-9a-f]{2}:/.test(value)) return true;
  return false;
}

function ipIsPrivate(ip) {
  const version = net.isIP(ip);
  if (version === 4) return ipv4IsPrivate(ip);
  if (version === 6) return ipv6IsPrivate(ip);
  return true;
}

export function isSafeRemoteUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || BLOCKED_HOST.test(host)) return false;
  return !(net.isIP(host) && ipIsPrivate(host));
}

export async function assertSafeRemoteUrl(value) {
  if (!isSafeRemoteUrl(value)) {
    throw new Error('URL refusée : utilise une adresse http(s) publique, sans adresse locale ou privée.');
  }
  const url = new URL(String(value).trim());
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!net.isIP(host)) {
    const addresses = await dns.lookup(host, { all: true, verbatim: true }).catch(() => []);
    if (!addresses.length) throw new Error('URL refusée : hôte introuvable.');
    if (addresses.some((entry) => ipIsPrivate(entry.address))) {
      throw new Error('URL refusée : cette adresse réseau est privée ou locale.');
    }
  }
  return url;
}

export async function safeFetch(value, options = {}, redirects = 0) {
  if (redirects > 3) throw new Error('URL refusée : trop de redirections.');
  const url = await assertSafeRemoteUrl(value);
  const response = await fetch(url, { ...options, redirect: 'manual' });
  if (![301, 302, 303, 307, 308].includes(response.status)) return response;
  const location = response.headers.get('location');
  if (!location) return response;
  return safeFetch(new URL(location, url).toString(), options, redirects + 1);
}
