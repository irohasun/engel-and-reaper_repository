/**
 * オンラインゲーム関連モジュールのエクスポート
 */

export {
  convertFirestoreToLocalGameState,
  type PlayerNicknameMap,
} from './gameStateConverter';

export {
  createActionDispatcher,
  type ActionDispatcherOptions,
  type ActionDispatcher,
  type ActionDispatchResult,
} from './actionDispatcher';
