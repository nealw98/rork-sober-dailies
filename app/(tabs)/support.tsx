import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/use-sobriety-store';
import { Phone, Plus, UserPlus, Trash2, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SupportScreen() {
  const router = useRouter();
  const { profile, removeEmergencyContact } = useSobriety();

  const handleCall = (phone: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleDeleteContact = (contactId: string, name: string) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${name} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeEmergencyContact(contactId)
        },
      ]
    );
  };

  const handleAddContact = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/add-contact');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Heart size={28} color="#6B46C1" />
        <Text style={styles.headerTitle}>Support Network</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddContact}
            >
              <Plus size={20} color="#6B46C1" />
            </TouchableOpacity>
          </View>

          {profile.emergencyContacts.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyContactCard}
              onPress={handleAddContact}
            >
              <UserPlus size={32} color="#9CA3AF" />
              <Text style={styles.emptyContactText}>Add your first emergency contact</Text>
              <Text style={styles.emptyContactSubtext}>
                Having support contacts can help during difficult moments
              </Text>
            </TouchableOpacity>
          ) : (
            profile.emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCall(contact.phone)}
                  >
                    <Phone size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteContact(contact.id, contact.name)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Crisis Hotlines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Hotlines</Text>
          
          <TouchableOpacity 
            style={styles.hotlineCard}
            onPress={() => handleCall('988')}
          >
            <View style={styles.hotlineInfo}>
              <Text style={styles.hotlineName}>988 Suicide & Crisis Lifeline</Text>
              <Text style={styles.hotlineDescription}>24/7 support for mental health crises</Text>
              <Text style={styles.hotlineNumber}>988</Text>
            </View>
            <Phone size={20} color="#6B46C1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hotlineCard}
            onPress={() => handleCall('1-800-662-4357')}
          >
            <View style={styles.hotlineInfo}>
              <Text style={styles.hotlineName}>SAMHSA National Helpline</Text>
              <Text style={styles.hotlineDescription}>Treatment referral and information service</Text>
              <Text style={styles.hotlineNumber}>1-800-662-HELP (4357)</Text>
            </View>
            <Phone size={20} color="#6B46C1" />
          </TouchableOpacity>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recovery Resources</Text>
          
          <View style={styles.resourceCard}>
            <Text style={styles.resourceTitle}>AA Meeting Finder</Text>
            <Text style={styles.resourceDescription}>
              Find local Alcoholics Anonymous meetings in your area
            </Text>
            <TouchableOpacity 
              style={styles.resourceButton}
              onPress={() => Linking.openURL('https://www.aa.org/find-aa')}
            >
              <Text style={styles.resourceButtonText}>Find Meetings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resourceCard}>
            <Text style={styles.resourceTitle}>The Big Book Online</Text>
            <Text style={styles.resourceDescription}>
              Read the AA Big Book and other recovery literature
            </Text>
            <TouchableOpacity 
              style={styles.resourceButton}
              onPress={() => Linking.openURL('https://www.aa.org/the-big-book')}
            >
              <Text style={styles.resourceButtonText}>Read Online</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#EDE9FE',
    padding: 8,
    borderRadius: 8,
  },
  emptyContactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyContactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
  },
  emptyContactSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  contactRelationship: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B46C1',
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  deleteButton: {
    padding: 10,
  },
  hotlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hotlineInfo: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  hotlineDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  hotlineNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B46C1',
    marginTop: 6,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  resourceButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  resourceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});