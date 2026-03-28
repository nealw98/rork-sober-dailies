import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync();
    } else if (Platform.OS === 'android') {
      return Application.androidId;
    }
    return null;
  } catch (error) {
    console.error('[PostHog] Failed to get device ID:', error);
    return null;
  }
}

function getSobrietyMilestone(sobrietyDate: string | null): string {
  if (!sobrietyDate) return 'not_set';
  try {
    const soberDate = new Date(sobrietyDate);
    const today = new Date();
    if (soberDate > today) return 'future_date';
    const diffTime = Math.abs(today.getTime() - soberDate.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (days < 30) return '0-30_days';
    if (days < 90) return '31-90_days';
    if (days < 180) return '3-6_months';
    if (days < 365) return '6-12_months';
    if (days < 730) return '1-2_years';
    if (days < 1825) return '2-5_years';
    if (days < 3650) return '5-10_years';
    if (days < 5475) return '10-15_years';
    if (days < 7300) return '15-20_years';
    if (days < 10950) return '20-30_years';
    return '30+_years';
  } catch (error) {
    return 'not_set';
  }
}

function PostHogIdentifier({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();

  useEffect(() => {
    let isMounted = true;

    const identifyUser = async () => {
      try {
        const deviceId = await getDeviceId();
        if (!deviceId || !isMounted || !posthog) return;

        const sobrietyDataStr = await AsyncStorage.getItem('sobriety_data');
        let sobrietyDate: string | null = null;
        
        if (sobrietyDataStr) {
          try {
            const sobrietyData = JSON.parse(sobrietyDataStr);
            sobrietyDate = sobrietyData.sobrietyDate || null;
          } catch (parseError) {
            console.error('[PostHog] Error parsing sobriety data:', parseError);
          }
        }

        const milestone = getSobrietyMilestone(sobrietyDate);
        
        posthog.identify(deviceId, {
          sobriety_milestone: milestone,
        });

        posthog.register({
          sobriety_milestone: milestone,
        });
      } catch (error) {
        console.error('[PostHog] Error during identification:', error);
      }
    };

    identifyUser();

    return () => {
      isMounted = false;
    };
  }, [posthog]);

  return <>{children}</>;
}

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
      <PostHogIdentifier>
        <View style={styles.container}>
          <Text>Open up App.tsx to start working on your app!</Text>
          <StatusBar style="auto" />
        </View>
      </PostHogIdentifier>
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