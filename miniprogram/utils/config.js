/**
 * Global config for the Mini Program.
 *
 * TODO: BASE_URL currently points at a local dev backend. Before shipping,
 * point this at the real deployed backend (and remember: WeChat Mini
 * Programs require the domain to be registered as a "request合法域名"
 * (legal request domain) in the Mini Program admin console, and it must
 * be HTTPS in production — http://localhost will only work in the
 * WeChat DevTools "不校验合法域名" debug mode).
 */
const BASE_URL = 'http://localhost:3000';

module.exports = {
  BASE_URL,
};
