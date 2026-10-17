const markerBaseUtilities =
  'tw:grid! tw:place-items-center tw:rounded-[12px] tw:text-base tw:font-extrabold';

const markerUtilities = {
  monitored:
    'tw:border-[3px]! tw:border-[#d97706]! tw:bg-[#fff7ed]! tw:text-[#111827]! tw:shadow-[0_0_0_4px_var(--bh-warning-28),0_12px_24px_var(--bh-shadow-28)] tw:dark:border-[#fbbf24]! tw:dark:bg-[#111827]! tw:dark:text-[#fbbf24]! tw:dark:shadow-[0_0_0_4px_var(--bh-warning-dark-16),0_12px_24px_var(--bh-shadow-16)]',
  stop:
    'tw:border-2! tw:border-[#667085]! tw:bg-white! tw:text-[#475467]! tw:shadow-[0_3px_9px_var(--bh-shadow-16)] tw:dark:border-[#98a2b3]! tw:dark:bg-[#0f2423]! tw:dark:text-[#e5e7eb]! tw:dark:shadow-[0_3px_10px_var(--bh-shadow-16)]',
  mobilibusStop:
    'tw:border-2! tw:border-[#0f766e]! tw:bg-[#ccfbf1]! tw:text-[#115e59]! tw:cursor-pointer tw:shadow-[0_3px_9px_var(--bh-shadow-16)] tw:dark:border-[#5eead4]! tw:dark:bg-bh-surface-inset! tw:dark:text-[#99f6e4]! tw:dark:shadow-[0_3px_10px_var(--bh-shadow-16)]',
  selectedMobilibusStop:
    'tw:border-2! tw:border-[#d97706]! tw:bg-[#fff7ed]! tw:text-[#9a3412]! tw:cursor-pointer tw:shadow-[0_0_0_4px_var(--bh-warning-28),0_12px_24px_var(--bh-attention-16)]! tw:dark:border-[#fbbf24]! tw:dark:bg-[#3b2410]! tw:dark:text-[#fbbf24]!',
  vehicle:
    'tw:border-2! tw:border-[var(--bh-white-28)]! tw:bg-[linear-gradient(145deg,#2dd4bf_0%,#14b8a6_48%,#0f766e_100%)]! tw:text-[#ecfeff]! tw:shadow-[0_0_0_4px_var(--bh-route-16),0_12px_24px_var(--bh-action-28)]',
  selectedVehicle:
    'tw:border-[3px]! tw:border-[var(--bh-white-28)]! tw:bg-[linear-gradient(145deg,#2dd4bf_0%,#14b8a6_48%,#0f766e_100%)]! tw:text-[#ecfeff]! tw:shadow-[0_0_0_5px_var(--bh-mint-28),0_14px_30px_var(--bh-action-28)]!',
  userLocation:
    'tw:border-[3px]! tw:border-white! tw:bg-[radial-gradient(circle_at_center,#60a5fa_0,#2563eb_55%,#1d4ed8_100%)]! tw:text-[#eff6ff]! tw:shadow-[0_0_0_6px_var(--bh-location-16),0_12px_24px_var(--bh-location-28)]',
} as const;

export const mapMarkerContentUtilities =
  'tw:grid tw:size-full tw:place-items-center tw:leading-[0]';

export function getMapMarkerUtilityClasses(semanticClassNames: string): string {
  const classes = new Set(semanticClassNames.split(/\s+/));
  const utilities = [markerBaseUtilities];

  if (classes.has('is-monitored')) {
    utilities.push(markerUtilities.monitored);
  } else if (classes.has('is-user-location')) {
    utilities.push(markerUtilities.userLocation);
  } else if (classes.has('is-vehicle')) {
    utilities.push(
      classes.has('is-selected-vehicle')
        ? markerUtilities.selectedVehicle
        : markerUtilities.vehicle,
    );
  } else if (classes.has('is-mobilibus-stop')) {
    utilities.push(
      classes.has('is-selected-mobilibus-stop')
        ? markerUtilities.selectedMobilibusStop
        : markerUtilities.mobilibusStop,
    );
  } else if (classes.has('is-stop')) {
    utilities.push(markerUtilities.stop);
  }

  return utilities.join(' ');
}

export const mapStopClusterUtilities =
  'tw:grid! tw:place-items-center tw:rounded-full tw:border-2! tw:border-[var(--bh-glass-white)]! tw:bg-[#475467]! tw:text-white! tw:text-[0.82rem] tw:font-extrabold tw:shadow-[0_0_0_1px_var(--bh-shadow-28),0_4px_12px_var(--bh-shadow-28)] tw:dark:border-[#d0d5dd]! tw:dark:bg-[#344054]! tw:dark:text-[#f9fafb]! tw:dark:shadow-[0_0_0_1px_var(--bh-white-28),0_4px_12px_var(--bh-shadow-16)]';

export const mapStopClusterTextUtilities = 'tw:leading-none tw:tabular-nums';

export const mapStopTooltipClassName =
  'map-stop-tooltip tw:z-[1000]! tw:border! tw:border-[var(--bh-accent-28)]! tw:rounded-[12px]! tw:bg-[var(--bh-glass-white)]! tw:text-[#111827]! tw:px-2.5! tw:py-[7px]! tw:min-w-[140px]! tw:max-w-[220px]! tw:text-[0.78rem]! tw:font-bold! tw:leading-[1.3]! tw:whitespace-normal! tw:break-normal! tw:[overflow-wrap:break-word]! tw:text-left! tw:shadow-[0_10px_24px_var(--bh-action-16)]! tw:before:hidden! tw:dark:border-[var(--bh-mint-28)]! tw:dark:bg-[var(--bh-glass-inset)]! tw:dark:text-[#f9fafb]!';

export const mapStopTooltipContentClassName =
  'map-stop-tooltip-content tw:grid tw:gap-0.5';

export const mapStopTooltipNumberClassName =
  'map-stop-tooltip-number tw:text-bh-copy tw:text-[0.72rem] tw:font-semibold tw:dark:text-[#c7d7d4]';

export const mapVehicleTooltipClassName =
  'map-vehicle-tooltip';
