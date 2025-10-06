import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Plus, Trash2, Edit3, BarChart3, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ScreenContainer from '@/components/ScreenContainer';
import { useInventoryDatabase } from '@/hooks/useInventoryDatabase';
import { InventoryItem } from '@/lib/database';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (itemName: string, category: 'on_beam' | 'off_beam', quantity: number, location: string, notes: string) => void;
  category?: 'on_beam' | 'off_beam';
}

const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onClose, onAdd, category }) => {
  const [itemName, setItemName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'on_beam' | 'off_beam'>(category || 'on_beam');
  const [quantity, setQuantity] = useState<string>('1');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleAdd = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const qty = parseInt(quantity) || 1;
    onAdd(itemName.trim(), selectedCategory, qty, location.trim(), notes.trim());
    
    // Reset form
    setItemName('');
    setQuantity('1');
    setLocation('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Inventory Item</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.textInput}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Enter item name"
              testID="item-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === 'on_beam' && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory('on_beam')}
                testID="on-beam-category"
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === 'on_beam' && styles.categoryButtonTextActive,
                  ]}
                >
                  On the Beam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === 'off_beam' && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory('off_beam')}
                testID="off-beam-category"
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === 'off_beam' && styles.categoryButtonTextActive,
                  ]}
                >
                  Off the Beam
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.textInput}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1"
              keyboardType="numeric"
              testID="quantity-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Where did this occur?"
              testID="location-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              multiline
              numberOfLines={3}
              testID="notes-input"
            />
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={handleAdd} testID="add-item-button">
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const InventoryItemCard: React.FC<{
  item: InventoryItem;
  onDelete: (id: number) => void;
  onEdit: (item: InventoryItem) => void;
}> = ({ item, onDelete, onEdit }) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id!) },
      ]
    );
  };

  return (
    <View style={[styles.itemCard, item.category === 'on_beam' ? styles.onBeamCard : styles.offBeamCard]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton} testID={`edit-${item.id}`}>
            <Edit3 size={16} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton} testID={`delete-${item.id}`}>
            <Trash2 size={16} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.quantity > 1 && (
        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
      )}
      
      {item.location && (
        <Text style={styles.itemLocation}>Location: {item.location}</Text>
      )}
      
      {item.notes && (
        <Text style={styles.itemNotes}>{item.notes}</Text>
      )}
      
      <Text style={styles.itemTimestamp}>
        {item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Now'}
      </Text>
    </View>
  );
};

const Inventory = () => {
  const {
    isLoading,
    error,
    addItem,
    deleteItem,
    getItemsByDate,
    getItemsByCategory,
    exportData,
    getTodayDateString,
  } = useInventoryDatabase();

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'on_beam' | 'off_beam' | null>(null);
  const [selectedDate] = useState<string>(getTodayDateString());

  const todayItems = getItemsByDate(selectedDate);
  const onBeamItems = getItemsByCategory(selectedDate, 'on_beam');
  const offBeamItems = getItemsByCategory(selectedDate, 'off_beam');

  const handleAddItem = async (
    itemName: string,
    category: 'on_beam' | 'off_beam',
    quantity: number,
    location: string,
    notes: string
  ) => {
    try {
      await addItem(itemName, category, quantity, location, notes, selectedDate);
    } catch {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteItem(id);
    } catch {
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  };

  const handleEditItem = () => {
    setShowAddModal(true);
  };

  const handleExportData = async () => {
    try {
      const data = await exportData();
      
      if (Platform.OS === 'web') {
        // For web, we can create a downloadable JSON file
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For mobile, show the data in an alert (in a real app, you'd use sharing)
        Alert.alert(
          'Export Data',
          `Total Sessions: ${data.sessions.length}\nTotal Items: ${data.items.length}\n\nData exported to console.`,
          [{ text: 'OK' }]
        );
        console.log('Exported inventory data:', data);
      }
    } catch {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const onTheBeam = [
    'HONESTY', 'FAITH', 'COURAGE', 'GIVING', 'CALM',
    'GRATEFUL', 'PATIENCE', 'LOVE', 'TRUST', 'ACTION'
  ];

  const offTheBeam = [
    'DISHONEST', 'FEAR', 'PRIDE', 'GREEDY', 'ANGER',
    'ENVY', 'IMPATIENT', 'HATE', 'SUSPICION', 'SLOTH'
  ];

  if (isLoading) {
    return (
      <ScreenContainer style={styles.container}>
        <Stack.Screen options={{}} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleExportData} style={styles.headerButton} testID="export-button">
                <Download size={20} color={Colors.light.tint} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowAddModal(true)} 
                style={styles.headerButton}
                testID="add-button"
              >
                <Plus size={20} color={Colors.light.tint} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      <ScreenContainer style={styles.container}>
        <LinearGradient
          colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <BarChart3 size={20} color={Colors.light.tint} />
                <Text style={styles.statsTitle}>Today&apos;s Summary</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{todayItems.length}</Text>
                  <Text style={styles.statLabel}>Total Items</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{onBeamItems.length}</Text>
                  <Text style={styles.statLabel}>On Beam</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#FF5722' }]}>{offBeamItems.length}</Text>
                  <Text style={styles.statLabel}>Off Beam</Text>
                </View>
              </View>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>Are you</Text>
              <Text style={styles.subtitle}>&quot;ON THE BEAM&quot;</Text>
              
              <View style={styles.cardContainer}>
                <View style={styles.gridContainer}>
                  <View style={styles.columnContainer}>
                    <View style={styles.columnHeader}>
                      <Text style={styles.columnTitleOn}>ON THE BEAM</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCategory('on_beam');
                          setShowAddModal(true);
                        }}
                        style={styles.quickAddButton}
                        testID="quick-add-on-beam"
                      >
                        <Plus size={16} color="#4CAF50" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.underline} />
                    
                    {onTheBeam.map((item, index) => (
                      <Text key={index} style={[styles.itemText, styles.noWrap]}>{item}</Text>
                    ))}
                    
                    {/* Today's On Beam Items */}
                    {onBeamItems.map((item) => (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onEdit={handleEditItem}
                      />
                    ))}
                  </View>
                  
                  <View style={styles.columnContainer}>
                    <View style={styles.columnHeader}>
                      <Text style={styles.columnTitleOff}>OFF THE BEAM</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCategory('off_beam');
                          setShowAddModal(true);
                        }}
                        style={styles.quickAddButton}
                        testID="quick-add-off-beam"
                      >
                        <Plus size={16} color="#FF5722" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.underline} />
                    
                    {offTheBeam.map((item, index) => (
                      <Text key={index} style={[styles.itemText, styles.noWrap]}>{item}</Text>
                    ))}
                    
                    {/* Today's Off Beam Items */}
                    {offBeamItems.map((item) => (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onEdit={handleEditItem}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ScreenContainer>

      <AddItemModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedCategory(null);
        }}
        onAdd={handleAddItem}
        category={selectedCategory || undefined}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: Colors.light.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 4,
  },
  contentContainer: {
    backgroundColor: 'white',
    padding: 20,
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: 'rgba(135, 206, 235, 0.7)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  columnContainer: {
    width: '48%',
    marginBottom: 16,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnTitleOn: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  columnTitleOff: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  quickAddButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  underline: {
    height: 2,
    backgroundColor: '#333',
    marginBottom: 12,
    marginTop: -10,
    width: '80%',
    alignSelf: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
    paddingVertical: 8,
  },
  noWrap: {
    flexShrink: 0,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  onBeamCard: {
    borderLeftColor: '#4CAF50',
  },
  offBeamCard: {
    borderLeftColor: '#FF5722',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemTimestamp: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    borderColor: Colors.light.tint,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  categoryButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: Colors.light.tint,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: Colors.light.muted,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Inventory;