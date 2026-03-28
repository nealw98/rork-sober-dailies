import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useInventoryDatabase } from '@/hooks/useInventoryDatabase';

const InventoryDemo = () => {
  const {
    items,
    stats,
    isLoading,
    error,
    addItem,
    exportData,
    clearAllData,
    getTodayDateString,
  } = useInventoryDatabase();

  useEffect(() => {
    console.log('Inventory Demo - Current stats:', stats);
    console.log('Inventory Demo - Current items:', items.length);
  }, [stats, items]);

  const handleAddSampleData = async () => {
    try {
      const today = getTodayDateString();
      
      // Add some sample items
      await addItem('Helped a colleague', 'on_beam', 1, 'Office', 'Assisted with project', today);
      await addItem('Lost my temper', 'off_beam', 1, 'Home', 'Got frustrated with traffic', today);
      await addItem('Practiced gratitude', 'on_beam', 1, 'Morning routine', 'Listed 3 things I\'m grateful for', today);
      
      Alert.alert('Success', 'Sample inventory items added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add sample data');
      console.error('Failed to add sample data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      Alert.alert(
        'Export Complete',
        `Exported ${data.sessions.length} sessions and ${data.items.length} items`,
        [{ text: 'OK' }]
      );
      console.log('Exported data:', data);
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
      console.error('Export failed:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all inventory data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'All data cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
              console.error('Clear data failed:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Inventory Database...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Database Demo</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Current Statistics:</Text>
        <Text style={styles.statText}>Total Items: {stats.totalItems}</Text>
        <Text style={styles.statText}>On Beam: {stats.onBeamCount}</Text>
        <Text style={styles.statText}>Off Beam: {stats.offBeamCount}</Text>
        <Text style={styles.statText}>Sessions: {stats.sessionsCount}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleAddSampleData}>
          <Text style={styles.buttonText}>Add Sample Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExport}>
          <Text style={styles.buttonText}>Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearData}>
          <Text style={styles.buttonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Database Features:</Text>
        <Text style={styles.infoText}>✓ SQLite storage on mobile</Text>
        <Text style={styles.infoText}>✓ AsyncStorage fallback on web</Text>
        <Text style={styles.infoText}>✓ Automatic schema migrations</Text>
        <Text style={styles.infoText}>✓ Data persistence through app updates</Text>
        <Text style={styles.infoText}>✓ Export functionality</Text>
        <Text style={styles.infoText}>✓ Query and analytics support</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
});

export default InventoryDemo;