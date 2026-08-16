import { Redirect } from 'expo-router';

// The actual Pass It On handoff is captured above the router in app/_layout so
// it can survive onboarding and the subscription gate. This route only keeps
// Expo Router from showing an unmatched-route screen after the handoff closes.
export default function PassHandoffRoute() {
  return <Redirect href="/" />;
}
