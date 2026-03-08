const APP_VERSION = '1.2.0';
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_VERSION;
} else if (typeof window !== 'undefined') {
    window.APP_VERSION = APP_VERSION;
} else if (typeof self !== 'undefined') {
    self.APP_VERSION = APP_VERSION;
}
