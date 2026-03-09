const store = {};

global.window = global;

global.localStorage = {
    _store: store,
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
};

global.document = {
    createElement() { return {}; },
    getElementById() { return null; }
};

global.navigator = {
    storage: null
};
