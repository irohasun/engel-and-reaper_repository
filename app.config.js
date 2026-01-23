import 'dotenv/config';

export default {
  expo: {
    name: "Angel & Reaper",
    slug: "angel-reaper-game",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#1a0f0a"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.angelreaper.game"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1a0f0a"
      },
      package: "com.angelreaper.game"
    },
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-8691757518674753~7767115198",
          iosAppId: "ca-app-pub-8691757518674753~7767115198"
        }
      ]
    ],
    web: {},
    extra: {
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
      eas: {
        projectId: "1a51dc27-fad7-497a-8455-a69f22bcd43c"
      }
    }
  }
};
