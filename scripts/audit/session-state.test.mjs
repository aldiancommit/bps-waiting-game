import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore, SESSION_KEY, SESSION_VERSION } from '../../src/SessionState.js';

const mock = (init = {}) => {
    const m = new Map(Object.entries(init));
    return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('save and read scene/game', () => {
    const s = mock();
    const store = createSessionStore(s);
    store.setScene('HubScene', { foo: 'bar' });
    assert.deepEqual(store.getScene(), { scene: 'HubScene', params: { foo: 'bar' } });
    store.setGame('tenten', { score: 100 });
    assert.deepEqual(store.getGame('tenten'), { score: 100 });
});

test('corrupt JSON, bad version, bad scene: purged', () => {
    for (const bad of ['{bad json', JSON.stringify({ v: 2, scene: 'HubScene', params: {} }), JSON.stringify({ v: 1, scene: 'BadScene', params: {} })]) {
        const s = mock({ [SESSION_KEY]: bad });
        assert.equal(createSessionStore(s).getScene(), null);
        assert.equal(s.getItem(SESSION_KEY), null);
    }
});

test('OpeningScene rejected', () => {
    const s = mock();
    const store = createSessionStore(s);
    store.setScene('OpeningScene', {});
    assert.equal(store.getScene(), null);
    s.setItem(SESSION_KEY, JSON.stringify({ v: 1, scene: 'OpeningScene', params: {} }));
    assert.equal(store.getScene(), null);
});

test('throwing storage is safe no-op', () => {
    const err = { getItem: () => { throw new Error('Quota'); }, setItem: () => { throw new Error('Quota'); }, removeItem: () => { throw new Error('Quota'); } };
    const store = createSessionStore(err);
    assert.doesNotThrow(() => {
        store.setScene('HubScene', {});
        assert.equal(store.getScene(), null);
        store.setGame('tenten', 1);
        store.clearGame('tenten');
        store.clearAll();
    });
});

test('clearGame and clearAll', () => {
    const s = mock();
    const store = createSessionStore(s);
    store.setScene('HubScene', {});
    store.setGame('tenten', 1);
    store.setGame('memory', 2);
    store.clearGame('tenten');
    assert.equal(store.getGame('tenten'), null);
    assert.equal(store.getGame('memory'), 2);
    store.clearAll();
    assert.equal(s.getItem(SESSION_KEY), null);
});
