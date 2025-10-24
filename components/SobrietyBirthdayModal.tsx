import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, X } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { calculateDaysBetween, parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const BIRTHDAY_STORAGE_KEY = 'last_shown_birthday_milestone';

interface SobrietyBirthdayModalProps {
  visible: boolean;
  onClose: () => void;
}

const SobrietyBirthdayModal: React.FC<SobrietyBirthdayModalProps> = ({ visible, onClose }) => {
  const { sobrietyDate } = useSobriety();
  const [milestone, setMilestone] = useState<string>('');
  const [animatedValue] = useState(new Animated.Value(0));
  const [iconScale] = useState(new Animated.Value(1));
  const confettiRef = useRef<any>(null);

  // Calculate milestone based on sobriety date
  const calculateMilestone = (sobrietyDateString: string): string | null => {
    const daysSober = calculateDaysBetween(sobrietyDateString);
    const today = formatLocalDate(new Date());
    
    // console.log('[BirthdayModal] Checking milestone for:', { sobrietyDateString, today, daysSober });
    
    // Check if today is exactly a milestone date
    const sobrietyDate = parseLocalDate(sobrietyDateString);
    
    // Monthly milestones (1-11 months)
    for (let months = 1; months <= 11; months++) {
      const milestoneDate = new Date(sobrietyDate);
      const originalDay = milestoneDate.getDate();
      
      // Add months
      milestoneDate.setMonth(milestoneDate.getMonth() + months);
      
      // If the day rolled over (e.g., Aug 31 -> Sept 31 -> Oct 1), 
      // set it to the last day of the target month instead
      if (milestoneDate.getDate() !== originalDay) {
        // Go back one day to get the last day of the target month
        milestoneDate.setDate(0);
      }
      
      const milestoneDateString = formatLocalDate(milestoneDate);
      
      // console.log('[BirthdayModal] Checking monthly milestone:', { months, milestoneDateString, today, matches: milestoneDateString === today });
      
      if (milestoneDateString === today) {
        console.log('[BirthdayModal] Found monthly milestone:', `${months}-month`);
        return `${months}-month`;
      }
    }
    
    // Yearly milestones starting from 1 year
    for (let years = 1; years <= 100; years++) {
      const milestoneDate = new Date(sobrietyDate);
      milestoneDate.setFullYear(milestoneDate.getFullYear() + years);
      const milestoneDateString = formatLocalDate(milestoneDate);
      
      // console.log('[BirthdayModal] Checking yearly milestone:', { years, milestoneDateString, today, matches: milestoneDateString === today });
      
      if (milestoneDateString === today) {
        const milestone = years === 1 ? '1-year' : years === 2 ? '2-year' : years === 3 ? '3-year' : years === 4 ? '4-year' : years === 5 ? '5-year' : `${years}-year`;
        console.log('[BirthdayModal] Found yearly milestone:', milestone);
        return milestone;
      }
    }
    
    // Check for 18-month milestone
    const eighteenMonthDate = new Date(sobrietyDate);
    eighteenMonthDate.setMonth(eighteenMonthDate.getMonth() + 18);
    const eighteenMonthDateString = formatLocalDate(eighteenMonthDate);
    
    // console.log('[BirthdayModal] Checking 18-month milestone:', { eighteenMonthDateString, today, matches: eighteenMonthDateString === today });
    
    if (eighteenMonthDateString === today) {
      console.log('[BirthdayModal] Found 18-month milestone');
      return '18-month';
    }
    
    // console.log('[BirthdayModal] No milestone found');
    return null;
  };

  // Check if we should show birthday modal
  const shouldShowBirthday = async (): Promise<boolean> => {
    if (!sobrietyDate) {
      console.log('[BirthdayModal] No sobriety date, not showing');
      return false;
    }
    
    const currentMilestone = calculateMilestone(sobrietyDate);
    console.log('[BirthdayModal] Current milestone:', currentMilestone);
    
    if (!currentMilestone) {
      console.log('[BirthdayModal] No milestone found, not showing');
      return false;
    }
    
    try {
      const lastShown = await AsyncStorage.getItem(BIRTHDAY_STORAGE_KEY);
      console.log('[BirthdayModal] Last shown milestone:', lastShown, 'Current milestone:', currentMilestone);
      const shouldShow = lastShown !== currentMilestone;
      console.log('[BirthdayModal] Should show birthday:', shouldShow);
      return shouldShow;
    } catch (error) {
      console.error('Error checking birthday storage:', error);
      return true; // Show by default if we can't check
    }
  };

  // Mark milestone as shown
  const markMilestoneAsShown = async (milestone: string) => {
    try {
      await AsyncStorage.setItem(BIRTHDAY_STORAGE_KEY, milestone);
    } catch (error) {
      console.error('Error saving birthday milestone:', error);
    }
  };

  // Format milestone for display
  const formatMilestoneDisplay = (milestone: string): string => {
    if (milestone.includes('-month')) {
      const months = milestone.split('-')[0];
      return `${months} Month`;
    } else if (milestone.includes('-year')) {
      const years = milestone.split('-')[0];
      return `${years} Year`;
    } else if (milestone === '18-month') {
      return '18 Month';
    }
    return milestone;
  };

  // Animate modal entrance and star burst celebration
  useEffect(() => {
    if (visible) {
      // Trigger confetti immediately
      if (confettiRef.current) {
        confettiRef.current.start();
      }
      
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      // Trigger icon animation after a short delay
      setTimeout(() => {
        // Icon bounce animation
        Animated.sequence([
          Animated.timing(iconScale, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

      }, 500);
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Reset animations
      iconScale.setValue(1);
    }
  }, [visible, animatedValue, iconScale]);

  // Check for birthday when component mounts
  useEffect(() => {
    const checkBirthday = async () => {
      if (!sobrietyDate) return;
      
      const shouldShow = await shouldShowBirthday();
      if (shouldShow) {
        const currentMilestone = calculateMilestone(sobrietyDate);
        if (currentMilestone) {
          setMilestone(currentMilestone);
          // Trigger haptic feedback for milestone
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    };

    checkBirthday();
  }, [sobrietyDate]);

  const handleClose = () => {
    if (milestone) {
      markMilestoneAsShown(milestone);
    }
    onClose();
  };

  if (!visible || !milestone) return null;

  const milestoneDisplay = formatMilestoneDisplay(milestone);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Confetti Effect */}
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{x: -10, y: 0}}
          autoStart={false}
          fadeOut={true}
          fallSpeed={3000}
        />
        
        <Animated.View 
          style={[
            styles.modal,
            {
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: animatedValue,
            },
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.modalGradient}
          >
            <View style={styles.modalContent}>
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                <PartyPopper size={48} color="white" />
              </Animated.View>
              
              <Text style={styles.title}>Happy {milestoneDisplay} Birthday!</Text>
              
              <Text style={styles.message}>
                Every day is a big deal but this milestone is awesome!
              </Text>
              
              <TouchableOpacity style={styles.okButton} onPress={handleClose}>
                <Text style={styles.okButtonText}>Celebrate!</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    maxWidth: 300,
    width: '100%',
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  okButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  okButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SobrietyBirthdayModal;
