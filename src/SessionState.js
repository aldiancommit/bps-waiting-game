export const SESSION_KEY = 'bps.session.v1';
export const SESSION_VERSION = 1;
export const VALID_SCENES = ['HubScene', 'BlockPuzzleScene', 'MemoryLevelSelectScene', 'MemoryScene'];
const MAX_BYTES = 200 * 1024;
const isObj = (o) => Boolean(o && typeof o === 'object' && !Array.isArray(o));

export function createSessionStore(storage) {
    const getStore = () => {
        if (storage) return storage;
        try { return typeof window !== 'undefined' ? window.sessionStorage : null; } catch { return null; }
    };
    const purge = (s) => { try { s?.removeItem?.(SESSION_KEY); } catch {} };

    const read = () => {
        const s = getStore();
        if (!s) return null;
        let raw;
        try { raw = s.getItem(SESSION_KEY); } catch { return null; }
        if (!raw || typeof raw !== 'string') return null;
        if (raw.length > MAX_BYTES) { purge(s); return null; }
        try {
            const data = JSON.parse(raw);
            if (!isObj(data) || data.v !== 1 || !VALID_SCENES.includes(data.scene) || !isObj(data.params)) {
                purge(s); return null;
            }
            if (data.games !== undefined && !isObj(data.games)) { purge(s); return null; }
            return data;
        } catch { purge(s); return null; }
    };

    const write = (rec) => {
        const s = getStore();
        if (!s) return false;
        try {
            const payload = {
                v: 1, scene: rec.scene, params: isObj(rec.params) ? rec.params : {},
                games: isObj(rec.games) ? rec.games : {}, savedAt: Date.now()
            };
            const json = JSON.stringify(payload);
            if (json.length > MAX_BYTES) return false;
            s.setItem(SESSION_KEY, json);
            return true;
        } catch { return false; }
    };

    return {
        setScene(sceneKey, params = {}) {
            if (!VALID_SCENES.includes(sceneKey)) return;
            let safeParams = {};
            try { safeParams = JSON.parse(JSON.stringify(params || {})); } catch {}
            const rec = read() || { v: 1, scene: sceneKey, params: safeParams, games: {}, savedAt: Date.now() };
            rec.scene = sceneKey; rec.params = isObj(safeParams) ? safeParams : {};
            write(rec);
        },
        getScene() { const r = read(); return r ? { scene: r.scene, params: r.params || {} } : null; },
        setGame(id, state) {
            if (!id || typeof id !== 'string') return;
            let safeState;
            try { safeState = JSON.parse(JSON.stringify(state)); } catch { return; }
            const rec = read() || { v: 1, scene: 'HubScene', params: {}, games: {}, savedAt: Date.now() };
            rec.games = isObj(rec.games) ? rec.games : {};
            rec.games[id] = safeState;
            write(rec);
        },
        getGame(id) { const r = read(); return r?.games && id in r.games ? r.games[id] : null; },
        clearGame(id) { const r = read(); if (r?.games && id in r.games) { delete r.games[id]; write(r); } },
        clearAll() { purge(getStore()); }
    };
}
export const sessionStore = createSessionStore();
