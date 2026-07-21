const { request, categoryArtClass } = require('../../utils/request');

// Must match backend/data/destinations.js START_POINTS exactly.
const START_POINTS = ['天安门', '中关村', '国贸', '首都机场'];

// Same storage key the 发现 (discover) page writes to when the user taps
// "加入行程规划" on a destination card. There's no global store/event bus
// in this 3-page scaffold, so wx.getStorageSync/setStorageSync is the
// shared-selection mechanism between the two tabs.
const SELECTED_FOR_PLAN_KEY = 'selectedForPlanIds';

function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0分钟';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分钟`;
}

Page({
  data: {
    startPoints: START_POINTS,
    activeStartPoint: START_POINTS[0],
    loadingSelection: true,
    selectedDestinations: [],
    planning: false,
    plan: null,
    itineraryName: '',
    saving: false,
  },

  onLoad() {
    this.loadSelectedDestinations();
  },

  onShow() {
    // The selection may have changed on the 发现 tab since we were last
    // shown — refresh, and drop any stale plan that no longer matches.
    this.loadSelectedDestinations();
  },

  onStartPointTap(e) {
    const point = e.currentTarget.dataset.point;
    if (point === this.data.activeStartPoint) return;
    this.setData({ activeStartPoint: point, plan: null });
  },

  async loadSelectedDestinations() {
    const selectedIds = wx.getStorageSync(SELECTED_FOR_PLAN_KEY) || [];

    if (selectedIds.length === 0) {
      this.setData({ selectedDestinations: [], loadingSelection: false, plan: null });
      return;
    }

    this.setData({ loadingSelection: true });

    try {
      const listRes = await request('/api/destinations');
      const idSet = new Set(selectedIds);
      const selectedDestinations = listRes.destinations
        .filter((d) => idSet.has(d.id))
        .map((d) => ({ ...d, artClass: categoryArtClass(d.category) }));

      // If the plan we're showing no longer matches the current selection
      // (something was removed/added on the 发现 tab), clear it so we don't
      // show a stale route.
      const stillMatches =
        this.data.plan &&
        selectedDestinations.length === this.data.plan.stops.length &&
        selectedDestinations.every((d) => this.data.plan.stops.some((s) => s.destinationId === d.id));

      this.setData({
        selectedDestinations,
        loadingSelection: false,
        plan: stillMatches ? this.data.plan : null,
      });
    } catch (err) {
      this.setData({ loadingSelection: false });
      wx.showToast({ title: '加载失败，请检查后端是否启动', icon: 'none' });
    }
  },

  onRemoveSelected(e) {
    const { id } = e.currentTarget.dataset;
    const current = new Set(wx.getStorageSync(SELECTED_FOR_PLAN_KEY) || []);
    current.delete(id);
    wx.setStorageSync(SELECTED_FOR_PLAN_KEY, Array.from(current));

    const selectedDestinations = this.data.selectedDestinations.filter((d) => d.id !== id);
    this.setData({ selectedDestinations, plan: null });
  },

  async onGeneratePlan() {
    if (this.data.planning) return;
    if (this.data.selectedDestinations.length === 0) {
      wx.showToast({ title: '先去"发现"页加入几个目的地吧', icon: 'none' });
      return;
    }

    this.setData({ planning: true });

    try {
      const res = await request('/api/itinerary/plan', {
        method: 'POST',
        data: {
          startPoint: this.data.activeStartPoint,
          destinationIds: this.data.selectedDestinations.map((d) => d.id),
        },
      });

      const stops = res.stops.map((s) => ({
        ...s,
        legDistanceLabel: `${s.legDistanceKm} km`,
        transitLabel: formatMinutes(s.estimatedTransitMinutes),
      }));

      this.setData({
        planning: false,
        plan: {
          startPoint: res.startPoint,
          stops,
          totalDistanceKm: res.totalDistanceKm,
          totalLabel: formatMinutes(res.totalEstimatedTransitMinutes),
        },
        itineraryName: `${res.startPoint}出发·周末行程`,
      });
    } catch (err) {
      this.setData({ planning: false });
      wx.showToast({ title: '规划失败，请重试', icon: 'none' });
    }
  },

  onItineraryNameInput(e) {
    this.setData({ itineraryName: e.detail.value });
  },

  async onSavePlan() {
    if (this.data.saving || !this.data.plan) return;
    this.setData({ saving: true });

    try {
      await request('/api/itineraries', {
        method: 'POST',
        data: {
          name: this.data.itineraryName.trim() || undefined,
          startPoint: this.data.plan.startPoint,
          destinationIds: this.data.selectedDestinations.map((d) => d.id),
          orderedStopIds: this.data.plan.stops.map((s) => s.destinationId),
          totalDistanceKm: this.data.plan.totalDistanceKm,
        },
      });
      this.setData({ saving: false });
      wx.showToast({ title: '行程已保存', icon: 'success' });
    } catch (err) {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },
});
