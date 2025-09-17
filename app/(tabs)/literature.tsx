import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Book, BookOpen, FileText, ChevronRight } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";

interface LiteratureOption {
  id: string;
  title: string;
  description: string;
  route: string;
}

const literatureOptions: LiteratureOption[] = [
  {
    id: "bigbook",
    title: "Alcoholics Anonymous",
    description: "The basic textbook for the AA program.",
    route: "/bigbook"
  },
  {
    id: "twelve-and-twelve",
    title: "Twelve Steps and Twelve Traditions",
    description: "In-depth exploration of the Steps and Traditions",
    route: "/twelve-and-twelve"
  },
  {
    id: "meeting-pocket",
    title: "AA Meeting in Your Pocket",
    description: "Quick access to the core AA readings used in meetings.",
    route: "/meeting-pocket"
  }
];

export default function LiteratureScreen() {
  // Add direct navigation buttons for debugging
  const handleDirectNavigation = (screenName: string) => {
    console.log(`🔵 Literature: Direct navigation to ${screenName}`);
    try {
      router.push(screenName);
      console.log(`🔵 Literature: Direct navigation to ${screenName} completed`);
    } catch (error) {
      console.error(`🔴 Literature: Direct navigation error for ${screenName}:`, error);
    }
  };
  const handleOptionPress = (route: string) => {
    console.log('🔵 Literature: handleOptionPress called with route:', route);
    try {
      // Log the current navigation state before navigating (guarded)
      if (typeof (router as any).getState === 'function') {
        const currentState = (router as any).getState();
        console.log('🧭 Navigation: Current state before navigation:', JSON.stringify({
          routes: currentState.routes.map((r: any) => ({ 
            name: r.name,
            path: r.path,
            params: r.params
          })),
          index: currentState.index,
          key: currentState.key,
          stale: currentState.stale,
          type: currentState.type
        }, null, 2));
      } else {
        console.log('🧭 Navigation: router.getState is not available in this environment');
      }
      
      // Get current route name for logging
      const currentRouteName = currentState.routes[currentState.index]?.name || 'unknown';
      console.log(`🧭 Navigation: Navigating from "${currentRouteName}" to "${route}"`);
      
      console.log('🔵 Literature: About to call router.push');
      // Use push for navigation since navigate is not available
      router.push(route as any);
      console.log('🔵 Literature: router.push completed successfully');
      
      // Log the state after navigation (on next tick, guarded)
      setTimeout(() => {
        try {
          if (typeof (router as any).getState === 'function') {
            const newState = (router as any).getState();
            const newRouteName = newState.routes[newState.index]?.name || 'unknown';
            console.log(`🧭 Navigation: Now on "${newRouteName}" after navigation to ${route}`);
            // Log the current route name after navigation
            console.log(`🧭 Navigation: Route navigation complete. Current route: ${newRouteName}`);
          } else {
            console.log('🧭 Navigation: router.getState is not available after navigation');
          }
        } catch (err) {
          console.error('🧭 Navigation: Error getting state after navigation:', err);
        }
      }, 100);
    } catch (error) {
      console.error('🔴 Literature: Error in router.push:', error);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
      />
      
      <View style={styles.content}>
        <View style={styles.mainContent}>
          <Text style={styles.title}>AA Literature</Text>
          <Text style={styles.subtitle}>
            Access the foundational texts of Alcoholics Anonymous
          </Text>
          
          {/* Debug navigation buttons */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Navigation</Text>
            <View style={styles.debugButtons}>
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => handleDirectNavigation('/bigbook')}
              >
                <Text style={styles.debugButtonText}>Big Book</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => handleDirectNavigation('/twelve-and-twelve')}
              >
                <Text style={styles.debugButtonText}>12&12</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => handleDirectNavigation('/meeting-pocket')}
              >
                <Text style={styles.debugButtonText}>Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.optionsContainer}>
            {literatureOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => {
                  console.log('🔵 Literature: TouchableOpacity pressed for:', option.id, option.route);
                  try {
                    console.log('🔵 Literature: typeof router.push =', typeof (router as any).push);
                    (router as any).push(option.route);
                    console.log('🔵 Literature: router.push returned without throwing for', option.route);
                  } catch (err) {
                    console.error('🔴 Literature: router.push threw for', option.route, err);
                  }
                }}
                onPressIn={() => console.log('🔵 Literature: TouchableOpacity onPressIn for:', option.id)}
                onPressOut={() => console.log('🔵 Literature: TouchableOpacity onPressOut for:', option.id)}
                activeOpacity={0.7}
                testID={`literature-option-${option.id}`}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIcon}>
                    {option.id === "bigbook" || option.id === "twelve-and-twelve" ? (
                      <BookOpen size={24} color={Colors.light.tint} />
                    ) : (
                      <FileText size={24} color={Colors.light.tint} />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.light.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 200, 200, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.3)',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  debugButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.light.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
  },
  
});