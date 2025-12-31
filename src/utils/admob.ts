/**
 * AdMob広告管理ユーティリティ
 * Google AdMobの初期化と広告表示を管理します
 * 
 * 注意: Expo Goでは動作しません。開発ビルド（EAS Build）が必要です。
 */

import Constants from 'expo-constants';

// 広告ユニットID（本番環境）
const AD_UNIT_ID = 'ca-app-pub-8691757518674753/1700384382';

// Expo Goかどうかを判定（開発ビルドではfalse）
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

// 広告インスタンス（シングルトン）
let interstitialAd: any = null;
let mobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;

// Expo Goでない場合のみ、AdMobモジュールを動的にインポート
if (!isExpoGo) {
  try {
    // @ts-ignore - 動的インポートのため型チェックをスキップ
    const admobModule = require('react-native-google-mobile-ads');
    mobileAds = admobModule.default;
    InterstitialAd = admobModule.InterstitialAd;
    AdEventType = admobModule.AdEventType;
  } catch (error) {
    console.warn('AdMob module not available:', error);
  }
}

/**
 * AdMobを初期化します
 * アプリ起動時に一度だけ呼び出してください
 * Expo Goでは何も行いません
 */
export async function initializeAdMob(): Promise<void> {
  // Expo Goの場合は初期化をスキップ
  if (isExpoGo) {
    console.log('AdMob: Skipping initialization (Expo Go)');
    return;
  }

  // AdMobモジュールが利用できない場合はスキップ
  if (!mobileAds || !InterstitialAd) {
    console.warn('AdMob: Module not available');
    return;
  }

  try {
    await mobileAds().initialize();
    console.log('AdMob initialized successfully');
    
    // インタースティシャル広告を作成
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    
    // 広告の読み込み
    loadInterstitialAd();
  } catch (error) {
    console.error('AdMob initialization error:', error);
  }
}

/**
 * インタースティシャル広告を読み込みます
 */
function loadInterstitialAd(): void {
  if (isExpoGo || !InterstitialAd || !AdEventType) {
    return;
  }

  if (!interstitialAd) {
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
  }

  // 広告イベントリスナーを設定
  const unsubscribe = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    console.log('Interstitial ad loaded');
  });

  interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
    console.error('Interstitial ad error:', error);
    // エラー時も広告を再読み込み
    setTimeout(() => {
      loadInterstitialAd();
    }, 5000);
  });

  // 広告が閉じられたら再読み込み
  interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('Interstitial ad closed');
    // 広告を再読み込み
    loadInterstitialAd();
  });

  // 広告を読み込む
  interstitialAd.load();
}

/**
 * インタースティシャル広告を表示します
 * @param onAdClosed 広告が閉じられたときに呼ばれるコールバック
 * @returns 広告が表示されたかどうか（読み込み済みの場合true）
 * 
 * 注意: Expo Goでは広告を表示せず、即座にコールバックを実行します
 */
export function showInterstitialAd(onAdClosed?: () => void): boolean {
  // Expo Goの場合は、広告を表示せずに即座にコールバックを実行
  if (isExpoGo) {
    console.log('AdMob: Skipping ad display (Expo Go)');
    if (onAdClosed) {
      onAdClosed();
    }
    return false;
  }

  // AdMobモジュールが利用できない場合
  if (!interstitialAd || !AdEventType) {
    console.warn('Interstitial ad not initialized');
    // 広告が初期化されていない場合は、コールバックを即座に実行
    if (onAdClosed) {
      onAdClosed();
    }
    return false;
  }

  // 広告が読み込み済みかチェック
  if (!interstitialAd.loaded) {
    console.log('Interstitial ad not loaded yet');
    // 広告が読み込まれていない場合は、コールバックを即座に実行
    if (onAdClosed) {
      onAdClosed();
    }
    return false;
  }

  // 広告が閉じられたときのコールバックを設定
  if (onAdClosed) {
    const unsubscribe = interstitialAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubscribe();
        onAdClosed();
      }
    );
  }

  // 広告を表示
  interstitialAd.show();
  return true;
}

/**
 * 広告が読み込み済みかどうかを確認します
 * Expo Goでは常にfalseを返します
 */
export function isAdLoaded(): boolean {
  if (isExpoGo || !interstitialAd) {
    return false;
  }
  return interstitialAd.loaded ?? false;
}

