import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { PostHogProvider } from 'posthog-react-native';

export default function App() {
  return (
    <PostHogProvider
      apiKey="phc_rNmxplbqDdGgWftieyYPJoKJHRYpWT0QHdwiSFYMfI1"
      options={{
        host: 'https://us.i.posthog.com',
        enableSessionReplay: true,
      }}
      autocapture={{
        captureTouches: false, // Disable touch autocapture
        captureLifecycleEvents: true, // Keep app open/close events
        captureScreens: true // Keep screen navigation
      }}
    >
      <View style={styles.container}>
        <Text>Open up App.tsx to start working on your app!</Text>
        <StatusBar style="auto" />
      </View>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});