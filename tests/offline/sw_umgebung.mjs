/* Nachgebaute Service-Worker-Umgebung: gerade so viel, dass sw.js darin läuft.
   Damit lässt sich prüfen, was der Service Worker cacht und was nicht, ohne
   einen Browser zu starten. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const schluessel = (r, ignoreSearch) => {
  const u = new URL(typeof r === 'string' ? r : r.url, 'https://test.local');
  return ignoreSearch ? u.pathname : u.pathname + u.search;
};

class FakeCache {
  constructor() { this.inhalt = new Map(); }
  /* Wie im Browser: gespeichert wird eine Kopie, und jeder Zugriff bekommt
     wieder eine eigene — sonst ist der Rumpf nach einmal Lesen verbraucht. */
  async put(req, res) { this.inhalt.set(schluessel(req), res.clone()); }
  async match(req, opt = {}) {
    const treffer = (() => {
      if (!opt.ignoreSearch) return this.inhalt.get(schluessel(req));
      const ziel = schluessel(req, true);
      for (const [k, v] of this.inhalt) if (k.split('?')[0] === ziel) return v;
      return undefined;
    })();
    return treffer ? treffer.clone() : undefined;
  }
  async keys() { return this.adressen.map((a) => new Request(new URL(a, 'https://test.local').href)); }
  get adressen() { return [...this.inhalt.keys()]; }
}

class FakeCaches {
  constructor() { this.speicher = new Map(); }
  async open(name) {
    if (!this.speicher.has(name)) this.speicher.set(name, new FakeCache());
    return this.speicher.get(name);
  }
  async keys() { return [...this.speicher.keys()]; }
  async delete(name) { return this.speicher.delete(name); }
  async match(req, opt = {}) {
    const c = opt.cacheName ? this.speicher.get(opt.cacheName) : [...this.speicher.values()][0];
    return c ? c.match(req, opt) : undefined;
  }
}

/* Im Browser löst der Service Worker relative Adressen gegen seinen Ort auf.
   Node braucht dafür eine Basis. */
class TestRequest extends Request {
  constructor(eingabe, init) {
    if (typeof eingabe === 'string') eingabe = new URL(eingabe, 'https://test.local').href;
    super(eingabe, init);
  }
}

/** Lädt sw.js in die Attrappe. `netz` beantwortet jeden Abruf. */
export function swLaden(wurzel, netz) {
  const hoerer = {};
  const nachrichten = [];
  const caches = new FakeCaches();
  const self = {
    location: { origin: 'https://test.local' },
    addEventListener: (typ, fn) => { (hoerer[typ] = hoerer[typ] || []).push(fn); },
    skipWaiting: () => { self.uebernommen = true; },
    clients: {
      claim: async () => true,
      matchAll: async () => [{ postMessage: (m) => nachrichten.push(m) }]
    },
    caches,
    fetch: netz,
    importScripts: (url) => {
      const datei = path.join(wurzel, url.replace('/lernwelt/', ''));
      vm.runInContext(fs.readFileSync(datei, 'utf8'), kontext);
    }
  };
  const kontext = vm.createContext({
    self, caches, fetch: netz, Request: TestRequest, Response, URL, Promise, console,
    setTimeout, clearTimeout, importScripts: (u) => self.importScripts(u)
  });
  kontext.globalThis = kontext;
  vm.runInContext(fs.readFileSync(path.join(wurzel, 'sw.js'), 'utf8'), kontext);

  const ausloesen = async (typ, ereignis = {}) => {
    const warten = [];
    const antworten = [];
    const e = {
      ...ereignis,
      waitUntil: (p) => warten.push(p),
      respondWith: (p) => antworten.push(p)
    };
    for (const fn of hoerer[typ] || []) fn(e);
    await Promise.all(warten);
    return antworten.length ? await antworten[0] : null;
  };
  return { self, caches, ausloesen, nachrichten, kontext };
}

export const antwort = (text, status = 200) =>
  new Response(text, { status, headers: { 'Content-Type': 'text/plain' } });
