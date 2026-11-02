/**
 * Auto-return to `/play` only after a live session observes active → finished.
 * Opening an already-finished game from history must not redirect.
 */
export function shouldAutoExitLiveRoom(input: {
  sawActiveInSession: boolean;
  status: string | undefined;
  alreadyHandled: boolean;
}): boolean {
  return Boolean(
    input.sawActiveInSession && input.status === "finished" && !input.alreadyHandled,
  );
}

/** Brief pause so both players can read the result before hub navigation. */
export const LIVE_FINISH_EXIT_MS = 1600;
