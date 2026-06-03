import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { AppRegistry, ScrollView, Text, View, LogBox } from "react-native";
import { name as appName } from "./app.json";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";

console.log("[BOOT] full entry start");

// Ignore specific warnings
LogBox.ignoreLogs(['Require cycle:']);

// Initialize Query Client
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2 * 60 * 1000, retry: 2 } },
});

// Register background handler for FCM
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message:', remoteMessage);
});

class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(
      "[RENDER-ERROR]",
      error && error.stack ? error.stack : error,
      info && info.componentStack,
    );
  }
  render() {
    if (this.state.error)
      return <Crash error={this.state.error} title="Render error" />;
    return this.props.children;
  }
}

function Crash({ error, title }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0a0e1a",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#ef4444",
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      <ScrollView style={{ maxHeight: 500 }}>
        <Text
          style={{ color: "#f1f5f9", fontSize: 12, fontFamily: "monospace" }}
        >
          {error && error.stack ? error.stack : String(error)}
        </Text>
      </ScrollView>
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

AppRegistry.registerComponent(appName, () => App);
console.log("[BOOT] registerComponent called for", appName);
