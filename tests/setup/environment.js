const _store = {};

global.window = global;

const _localStorageMethods = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null;
    },
    setItem(key, value) {
        _store[key] = String(value);
    },
    removeItem(key) {
        delete _store[key];
    },
    clear() {
        Object.keys(_store).forEach(k => delete _store[k]);
    }
};

global.localStorage = new Proxy(_localStorageMethods, {
    ownKeys() {
        return Object.keys(_store);
    },
    getOwnPropertyDescriptor(target, key) {
        if (Object.prototype.hasOwnProperty.call(_store, key)) {
            return { value: _store[key], writable: true, enumerable: true, configurable: true };
        }
        return Object.getOwnPropertyDescriptor(target, key);
    },
    get(target, prop) {
        if (prop in _localStorageMethods) {
            return _localStorageMethods[prop];
        }
        return _store[prop];
    }
});

global.document = {
    createElement() { return {}; },
    getElementById() { return null; }
};

global.navigator = {
    storage: null
};

global.Blob = class {
    constructor(parts) {
        this.size = parts.reduce((acc, part) => acc + String(part).length, 0);
    }
};

global.FileReader = class FileReader {
    readAsText() {
        process.nextTick(() => {
            if (this.onload) {
                this.onload({ target: { result: '' } });
            }
        });
    }
};
