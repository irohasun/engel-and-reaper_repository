# Playmat Color Change Deferral Implementation Plan

The goal is to ensure the playmat color (indicating "Reach" status or 1 win) only changes *after* the "Next Round" button is pressed.
I will move the "win update" logic from the partial result step (`REVEAL_CARD`) to the next round preparation step (`prepareNextRound` or `ADVANCE_PHASE`), except for game-over scenarios.

## User Review Required
> [!NOTE]
> This changes the state management logic: `wins` count will no longer update immediately upon round success, but will wait until the next round starts. This ensures all UI components (not just PlayMat) show the old state during the "Round End" review phase.

## Proposed Changes

### Logic & State
#### [MODIFY] [GameContext.tsx](file:///Users/kuriyamakoya/cursor/engel-and-reaper_repository/src/contexts/GameContext.tsx)
- In `REVEAL_CARD` case:
    - When checking win condition, use a temporary player list with incremented wins (as currently done).
    - If **Game Over**: Update state with the incremented wins (so ResultScreen is correct).
    - If **Round End** (Continue): **Do NOT** update `state.players` with incremented wins yet. Keep `wins` at current value.
    - Ensure `highestBidderId` is preserved to identify who should get the point in the next step.

#### [MODIFY] [utils/gameLogic.ts](file:///Users/kuriyamakoya/cursor/engel-and-reaper_repository/src/utils/gameLogic.ts)
- In `prepareNextRound` function:
    - Identify the winner of the previous round (using `highestBidderId` or `revealingPlayerId`).
    - Increment their `wins` count here, *before* resetting game state for the new round.
    - Note: This function needs access to the "winner" context. Currently it takes `state`. `state.highestBidderId` should hold the winner.

### Components
#### [MODIFY] [PlayMat.tsx](file:///Users/kuriyamakoya/cursor/engel-and-reaper_repository/src/components/game/PlayMat.tsx)
- Remove the temporary masking logic (`displayWins = ... ? wins - 1 : wins`) since the state itself will now hold the "old" wins count during `round_end`.

## Verification Plan

### Manual Verification
1. **Start Game**: Test Mode.
2. **Win Round**:
    - Win the round.
    - Verify Playmat color is **Normal** (Wins still 0 in state).
3. **Next Round**:
    - Click "Next Round".
    - Verify Playmat color changes to **Reach** (Wins update to 1 in state).
4. **Game Over**:
    - Win 2nd round.
    - Verify Result Screen shows correct winner details (Wins updated immediately).
