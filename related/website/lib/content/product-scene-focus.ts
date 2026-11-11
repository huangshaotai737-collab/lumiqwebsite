/** Product bounds in the displayed 4:3 scene, in percent. Keep the whole device
 * (including its frame) and a little context; never crop to the screen alone. */
export type ProductFocus = readonly [x: number, y: number, width: number, height: number];

export const productSceneFocus: Record<string, ProductFocus> = {
  "/assets/western-scenes-20260908/ola-family-kitchen-v2.webp": [40, 37, 24, 55],
  "/assets/ola-scenes-20261103/adult-senior-companion.webp": [10, 33, 24, 52],
  "/assets/western-scenes-20260908/ola-senior-reminder-v2.webp": [15, 33, 25, 52],
  "/assets/western-scenes-20260908/ola-bedtime-story-v2.webp": [10, 31, 24, 48],
  "/assets/product-scenes-20261103/olago-home.webp": [50, 40, 15, 22],
  "/assets/product-scenes-20261103/olago-outdoor.webp": [61, 42, 27, 39],
  "/assets/product-scenes-20261103/olago-weather.webp": [60, 35, 16, 22],
  "/assets/product-scenes-20261103/olago-journal.webp": [59, 29, 20, 29],
  "/assets/product-scenes-20261103/olago-connected.webp": [46, 32, 17, 23],
  "/assets/product-scenes-20261103/olago-avatar.webp": [68, 51, 20, 29],
  "/assets/tablet-detail/generated/tablet-reading-lifestyle-v2.png": [22, 52, 49, 40],
  "/assets/tablet-detail/generated/tablet-passive-screen-time-v2.png": [40, 34, 28, 31],
  "/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png": [23, 45, 47, 40],
  "/assets/tablet-detail/five-ways/imagime-v1.jpg": [29, 48, 51, 48],
  "/assets/product-scenes-20261103/tablet-growth.webp": [34, 42, 33, 29],
  "/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png": [32, 51, 37, 31],
  "/assets/product-scenes-20261103/tablet-stages.webp": [32, 49, 43, 34],
  "/assets/western-scenes-20260908/tablet-parent-controls-v2.webp": [4, 43, 40, 46],
  "/assets/print-detail/consistent-20260907/gift.webp": [28, 43, 51, 49],
  "/assets/print-detail/consistent-20260907/reading.webp": [14, 34, 75, 60],
};

export const orbProductFocus: Record<"kitchen" | "closeup" | "overview" | "calendar" | "chores", ProductFocus> = {
  kitchen: [7, 32, 58, 57],
  overview: [7, 32, 58, 57],
  calendar: [7, 32, 58, 57],
  chores: [7, 32, 58, 57],
  closeup: [6, 6, 87, 88],
};
