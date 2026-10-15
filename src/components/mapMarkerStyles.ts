const markerBaseUtilities =
  'tw:grid! tw:place-items-center tw:rounded-[12px] tw:text-base tw:font-extrabold';

const markerUtilities = {
  monitored:
    'tw:border-[3px]! tw:border-[#f59e0b]! tw:bg-[#fff7ed]! tw:text-[#111827]! tw:shadow-[0_0_0_4px_rgba(245,158,11,0.22),0_12px_24px_rgba(23,32,26,0.28)] tw:dark:border-[#fbbf24]! tw:dark:bg-[#111827]! tw:dark:text-[#fbbf24]! tw:dark:shadow-[0_0_0_4px_rgba(251,191,36,0.22),0_12px_24px_rgba(0,0,0,0.38)]',
  stop:
    'tw:border-2! tw:border-[#64748b]! tw:bg-white! tw:text-[#475467]! tw:shadow-[0_3px_9px_rgba(23,32,26,0.18)] tw:dark:border-[#94a3b8]! tw:dark:bg-[#253b3e]! tw:dark:text-[#e2e8f0]! tw:dark:shadow-[0_3px_10px_rgba(0,0,0,0.38)]',
  mobilibusStop:
    'tw:border-2! tw:border-[#0f766e]! tw:bg-[#ccfbf1]! tw:text-[#115e59]! tw:cursor-pointer tw:shadow-[0_3px_9px_rgba(23,32,26,0.18)] tw:dark:border-[#5eead4]! tw:dark:bg-[#0f2423]! tw:dark:text-[#99f6e4]! tw:dark:shadow-[0_3px_10px_rgba(0,0,0,0.38)]',
  selectedMobilibusStop:
    'tw:border-2! tw:border-[#f59e0b]! tw:bg-[#fff7ed]! tw:text-[#9a3412]! tw:cursor-pointer tw:shadow-[0_0_0_4px_rgba(245,158,11,0.25),0_12px_24px_rgba(154,52,18,0.24)]! tw:dark:border-[#fbbf24]! tw:dark:bg-[#3b2410]! tw:dark:text-[#fbbf24]!',
  vehicle:
    'tw:border-2! tw:border-[rgba(255,255,255,0.38)]! tw:bg-[linear-gradient(145deg,#2dd4bf_0%,#14b8a6_48%,#0f766e_100%)]! tw:text-[#ecfeff]! tw:shadow-[0_0_0_4px_rgba(20,184,166,0.16),0_12px_24px_rgba(15,118,110,0.32)]',
  selectedVehicle:
    'tw:border-[3px]! tw:border-[rgba(255,255,255,0.38)]! tw:bg-[linear-gradient(145deg,#2dd4bf_0%,#14b8a6_48%,#0f766e_100%)]! tw:text-[#ecfeff]! tw:shadow-[0_0_0_5px_rgba(245,158,11,0.22),0_14px_30px_rgba(91,33,182,0.38)]!',
  userLocation:
    'tw:border-[3px]! tw:border-white! tw:bg-[radial-gradient(circle_at_center,#60a5fa_0,#2563eb_55%,#1d4ed8_100%)]! tw:text-[#eff6ff]! tw:shadow-[0_0_0_6px_rgba(37,99,235,0.18),0_12px_24px_rgba(37,99,235,0.28)]',
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
  'tw:grid! tw:place-items-center tw:rounded-full tw:border-2! tw:border-[rgba(255,255,255,0.96)]! tw:bg-[#475467]! tw:text-white! tw:text-[0.82rem] tw:font-extrabold tw:shadow-[0_0_0_1px_rgba(71,84,103,0.75),0_4px_12px_rgba(16,24,40,0.28)] tw:dark:border-[#d1d5db]! tw:dark:bg-[#334155]! tw:dark:text-[#f8fafc]! tw:dark:shadow-[0_0_0_1px_rgba(203,213,225,0.56),0_4px_12px_rgba(0,0,0,0.42)]';

export const mapStopClusterTextUtilities = 'tw:leading-none tw:tabular-nums';

export const mapStopTooltipClassName =
  'map-stop-tooltip tw:z-[1000]! tw:border! tw:border-[rgba(245,158,11,0.35)]! tw:rounded-[12px]! tw:bg-[rgba(255,251,235,0.96)]! tw:text-[#111827]! tw:px-2.5! tw:py-[7px]! tw:min-w-[140px]! tw:max-w-[220px]! tw:text-[0.78rem]! tw:font-bold! tw:leading-[1.3]! tw:whitespace-normal! tw:break-normal! tw:[overflow-wrap:break-word]! tw:text-left! tw:shadow-[0_10px_24px_rgba(120,53,15,0.18)]! tw:before:hidden! tw:dark:border-[rgba(251,191,36,0.48)]! tw:dark:bg-[rgba(20,36,35,0.98)]! tw:dark:text-[#f9fafb]!';

export const mapStopTooltipContentClassName =
  'map-stop-tooltip-content tw:grid tw:gap-0.5';

export const mapStopTooltipNumberClassName =
  'map-stop-tooltip-number tw:text-bh-copy tw:text-[0.72rem] tw:font-semibold tw:dark:text-[#b7cfcb]';

export const mapVehicleTooltipClassName =
  'map-vehicle-tooltip tw:z-[1000]! tw:border-2! tw:border-[rgba(255,255,255,0.98)]! tw:rounded-full! tw:bg-[rgba(8,47,43,0.94)]! tw:text-[#f0fdfa]! tw:px-2.5! tw:py-1.5! tw:text-[0.8rem]! tw:font-extrabold! tw:leading-none! tw:shadow-[0_0_0_1px_rgba(8,47,43,0.72),0_12px_24px_rgba(8,47,43,0.28)]! tw:before:hidden!';
