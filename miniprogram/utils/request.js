/**
 * Thin wrapper around wx.request -> Promise, plus small helpers shared by
 * all pages.
 */
const { BASE_URL } = require('./config');

function request(path, { method = 'GET', data } = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: { 'content-type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data && res.data.error ? new Error(res.data.error) : new Error('request failed'));
        }
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

// Category -> WXSS class suffix used for the simplified card-background
// treatment (see pages/discover/discover.wxss). Simplification note: since
// Mini Programs can't inline arbitrary <svg> in WXML the way the earlier
// HTML/SVG demo did, each destination card uses a small set of pre-defined
// WXSS gradient "art" backgrounds keyed by category, rather than a unique
// illustration per destination.
const CATEGORY_STYLE = {
  自然风光: 'card-art--nature',
  人文历史: 'card-art--culture',
};

function categoryArtClass(category) {
  return CATEGORY_STYLE[category] || 'card-art--nature';
}

module.exports = { request, categoryArtClass };
