const { request, categoryArtClass } = require('../../utils/request');

const CATEGORIES = ['ALL', '自然风光', '人文历史'];
// Local storage key used to hand the current "加入行程规划" selection off to
// the itinerary page. Kept simple (storage, not a global store/event bus)
// since this is a 3-page scaffold.
const SELECTED_FOR_PLAN_KEY = 'selectedForPlanIds';

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: 'ALL',
    keyword: '',
    loading: true,
    destinations: [],
  },

  onLoad() {
    this.fetchDestinations();
  },

  onShow() {
    // Favorite / selection state may have changed on another tab.
    this.fetchDestinations();
  },

  onPullDownRefresh() {
    this.fetchDestinations(() => wx.stopPullDownRefresh());
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.fetchDestinations();
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category }, () => this.fetchDestinations());
  },

  async fetchDestinations(done) {
    this.setData({ loading: true });

    try {
      const query = [];
      if (this.data.activeCategory !== 'ALL') {
        query.push(`category=${encodeURIComponent(this.data.activeCategory)}`);
      }
      if (this.data.keyword.trim()) {
        query.push(`keyword=${encodeURIComponent(this.data.keyword.trim())}`);
      }
      const qs = query.length ? `?${query.join('&')}` : '';

      const [listRes, favRes] = await Promise.all([
        request(`/api/destinations${qs}`),
        request('/api/favorites').catch(() => ({ favorites: [] })), // favorites are a nice-to-have overlay; don't block the list on failure
      ]);

      const favoriteIds = new Set((favRes.favorites || []).map((f) => f.id));
      const selectedIds = new Set(wx.getStorageSync(SELECTED_FOR_PLAN_KEY) || []);

      const destinations = listRes.destinations.map((d) => ({
        ...d,
        artClass: categoryArtClass(d.category),
        isFavorite: favoriteIds.has(d.id),
        isSelected: selectedIds.has(d.id),
      }));

      this.setData({ destinations, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请检查后端是否启动', icon: 'none' });
    }

    if (done) done();
  },

  async onToggleFavorite(e) {
    const { id, isfav } = e.currentTarget.dataset;
    try {
      if (isfav) {
        await request(`/api/favorites/${id}`, { method: 'DELETE' });
      } else {
        await request('/api/favorites', { method: 'POST', data: { destinationId: id } });
      }
      this.fetchDestinations();
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onToggleSelectForPlan(e) {
    const { id } = e.currentTarget.dataset;
    const current = new Set(wx.getStorageSync(SELECTED_FOR_PLAN_KEY) || []);

    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }

    wx.setStorageSync(SELECTED_FOR_PLAN_KEY, Array.from(current));

    const destinations = this.data.destinations.map((d) =>
      d.id === id ? { ...d, isSelected: current.has(id) } : d
    );
    this.setData({ destinations });
  },
});
