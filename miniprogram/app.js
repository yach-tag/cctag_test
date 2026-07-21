App({
  globalData: {
    // Local, non-persisted cache of favorite destination ids so pages can
    // optimistically render without waiting on a round trip. The backend
    // (GET /api/favorites) remains the source of truth.
    favoriteIds: [],
  },

  onLaunch() {
    // eslint-disable-next-line no-console
    console.log('北京周末去哪儿玩 mini program launched');
  },
});
