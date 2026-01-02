import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sun, Moon } from 'lucide-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { adjustFontWeight } from '@/constants/fonts';

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = React.useState(true);

  const handleClose = () => {
    setVisible(false);
    router.back();
  };

  const handleNavigate = (route: string) => {
    setVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Daily Tools</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <X color="#666" size={24} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Morning Section */}
            <View style={styles.routineSection}>
              <View style={styles.sectionHeader}>
                <Sun color="#1E3A5F" size={18} />
                <Text style={styles.sectionTitle}>Morning</Text>
              </View>
              <View style={styles.tilesRow}>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => handleNavigate('/(tabs)/prayers?prayer=morning')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
                    style={styles.tileGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome6 name="hands-praying" size={28} color="#fff" solid />
                    <Text style={styles.tileLabel}>Prayer</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => handleNavigate('/(tabs)/gratitude')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
                    style={styles.tileGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome6 name="face-smile" size={28} color="#fff" solid />
                    <Text style={styles.tileLabel}>Gratitude</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Evening Section */}
            <View style={styles.routineSection}>
              <View style={styles.sectionHeader}>
                <Moon color="#1E3A5F" size={18} />
                <Text style={styles.sectionTitle}>Evening</Text>
              </View>
              <View style={styles.tilesRow}>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => handleNavigate('/(tabs)/prayers?prayer=evening')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
                    style={styles.tileGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome6 name="hands-praying" size={28} color="#fff" solid />
                    <Text style={styles.tileLabel}>Prayer</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => handleNavigate('/(tabs)/evening-review')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
                    style={styles.tileGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="moon" size={28} color="#fff" />
                    <Text style={styles.tileLabel}>Review</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#1E3A5F',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  routineSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#1E3A5F',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tileGradient: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
    marginTop: 10,
  },
});

