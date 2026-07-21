const { request, categoryArtClass } = require('../../utils/request');

// 收藏 (favorites) and "加入行程规划" (add-to-itinerary) are two separate
// concepts in this app — see pages/discover/discover.js: favorites are
// backed by GET/POST/DELETE /api/favorites, while the itinerary selection
// is a local wx.storage set (SELECTED_FOR_PLAN_KEY) with its own toggle.
// This page only manages the favorites half, consistent with how the
// 发现 page's card already keeps the two actions independent.

Page({
  data: {
    loading: true,
    favorites: [],
  },

  onLoad() {
    this.fetchFavorites();
  },

  onShow() {
    // Favorites may have changed via the 发现 tab's star toggle.
    this.fetchFavorites();
  },

  onPullDownRefresh() {
    this.fetchFavorites(() => wx.stopPullDownRefresh());
  },

  async fetchFavorites(done) {
    this.setData({ loading: true });

    try {
      const res = await request('/api/favorites');
      const favorites = (res.favorites || []).map((d) => ({
        ...d,
        artClass: categoryArtClass(d.category),
      }));
      this.setData({ favorites, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请检查后端是否启动', icon: 'none' });
    }

    if (done) done();
  },

  async onRemoveFavorite(e) {
    const { id } = e.currentTarget.dataset;

    try {
      await request(`/api/favorites/${id}`, { method: 'DELETE' });
      const favorites = this.data.favorites.filter((f) => f.id !== id);
      this.setData({ favorites });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});
