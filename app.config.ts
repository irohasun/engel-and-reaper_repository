/**
 * Expo 動的設定ファイル
 * 
 * このファイルは環境変数からFirebase設定を読み込みます。
 * APIキーなどの機密情報はソースコードに含めず、.env.localファイルで管理します。
 * 
 * 開発環境: .env.local ファイルに環境変数を設定
 * 本番環境: EAS Secrets に環境変数を設定
 */
import { ExpoConfig, ConfigContext } from 'expo/config';

// dotenvを使用して環境変数を読み込む
// app.config.ts実行時に.env.localがあれば読み込まれる
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local を優先的に読み込み、なければ .env を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Angel & Reaper',
    slug: 'angel-reaper-game',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
        image: './assets/icon.png',
        resizeMode: 'contain',
        backgroundColor: '#1a0f0a',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.angelreaper.game',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/icon.png',
            backgroundColor: '#1a0f0a',
        },
        package: 'com.angelreaper.game',
    },
    plugins: [
        [
            'react-native-google-mobile-ads',
            {
                androidAppId: 'ca-app-pub-8691757518674753~7767115198',
                iosAppId: 'ca-app-pub-8691757518674753~7767115198',
            },
        ],
    ],
    web: {},
    extra: {
        // Firebase設定は環境変数から読み込む
        // これにより、APIキーがソースコードに含まれなくなる
        firebase: {
            apiKey: process.env.FIREBASE_API_KEY || '',
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.FIREBASE_PROJECT_ID || '',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: process.env.FIREBASE_APP_ID || '',
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
        },
        eas: {
            projectId: '1a51dc27-fad7-497a-8455-a69f22bcd43c',
        },
    },
});
