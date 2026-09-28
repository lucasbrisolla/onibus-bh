import { computed, ref } from 'vue';

const SHEET_GESTURE_ZONE_HEIGHT = 108;
const SWIPE_THRESHOLD_PX = 56;
const DRAG_START_TOLERANCE_PX = 8;
const PEEK_HEIGHT_PX = 44;
const HALF_HEIGHT_RATIO = 0.42;
const HALF_MAX_HEIGHT_PX = 340;
const FULL_BOTTOM_OFFSET_PX = 68;
const FULL_TOP_GAP_PX = 8;
const CLICK_SUPPRESSION_MS = 400;

export type SheetState = 'peek' | 'half' | 'full';

const SHEET_STATES: SheetState[] = ['peek', 'half', 'full'];

function getViewportHeight(): number {
  return typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 800;
}

function getSheetHeight(state: SheetState): number {
  if (state === 'peek') {
    return PEEK_HEIGHT_PX;
  }

  if (state === 'half') {
    return Math.min(getViewportHeight() * HALF_HEIGHT_RATIO, HALF_MAX_HEIGHT_PX);
  }

  return Math.max(
    PEEK_HEIGHT_PX,
    getViewportHeight() - FULL_BOTTOM_OFFSET_PX - FULL_TOP_GAP_PX,
  );
}

export function useBottomSheet() {
  const sheetState = ref<SheetState>('half');
  const sheetElement = ref<HTMLElement | null>(null);
  const dragHeight = ref<number | null>(null);
  const isDragging = ref(false);

  let touchStartY: number | null = null;
  let touchStartHeight = getSheetHeight('half');
  let isTrackingGesture = false;
  let hasDragged = false;
  let ignoreClickUntil = 0;

  const dragStyle = computed(() => (
    dragHeight.value === null ? undefined : { height: `${dragHeight.value}px` }
  ));

  function setSheetElement(element: unknown) {
    sheetElement.value = element instanceof HTMLElement ? element : null;
  }

  function moveSheet(direction: 'up' | 'down') {
    const currentIndex = SHEET_STATES.indexOf(sheetState.value);
    const nextIndex = direction === 'up'
      ? Math.min(SHEET_STATES.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

    sheetState.value = SHEET_STATES[nextIndex];
  }

  function toggleSheet() {
    if (Date.now() < ignoreClickUntil) {
      ignoreClickUntil = 0;
      return;
    }

    sheetState.value = sheetState.value === 'peek' ? 'half' : 'peek';
  }

  function onTouchStart(event: TouchEvent) {
    const firstTouch = event.touches[0];
    if (!firstTouch) {
      return;
    }

    const sheetTop = sheetElement.value?.getBoundingClientRect().top ?? 0;
    const canStartGesture =
      sheetState.value === 'peek' || firstTouch.clientY <= sheetTop + SHEET_GESTURE_ZONE_HEIGHT;

    if (!canStartGesture) {
      touchStartY = null;
      isTrackingGesture = false;
      return;
    }

    isTrackingGesture = true;
    hasDragged = false;
    touchStartY = firstTouch.clientY;
    touchStartHeight = sheetElement.value?.getBoundingClientRect().height ?? getSheetHeight(sheetState.value);
    dragHeight.value = touchStartHeight;
    isDragging.value = true;
  }

  function onTouchMove(event: TouchEvent) {
    if (!isTrackingGesture || touchStartY === null) {
      return;
    }

    const currentTouch = event.touches[0];
    if (!currentTouch) {
      return;
    }

    const deltaY = touchStartY - currentTouch.clientY;
    if (Math.abs(deltaY) > DRAG_START_TOLERANCE_PX) {
      hasDragged = true;
      event.preventDefault();
    }

    const minHeight = getSheetHeight('peek');
    const maxHeight = getSheetHeight('full');
    dragHeight.value = Math.min(maxHeight, Math.max(minHeight, touchStartHeight + deltaY));
  }

  function resetGesture() {
    touchStartY = null;
    isTrackingGesture = false;
    isDragging.value = false;
    dragHeight.value = null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (!isTrackingGesture || touchStartY === null) {
      return;
    }

    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
    const deltaY = touchEndY - touchStartY;
    const wasDragged = hasDragged;
    resetGesture();

    if (wasDragged) {
      ignoreClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    }

    if (deltaY > SWIPE_THRESHOLD_PX) {
      moveSheet('down');
      return;
    }

    if (deltaY < -SWIPE_THRESHOLD_PX) {
      moveSheet('up');
    }
  }

  function onTouchCancel() {
    if (isTrackingGesture) {
      resetGesture();
    }
  }

  return {
    sheetState,
    setSheetElement,
    dragStyle,
    isDragging,
    toggleSheet,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
