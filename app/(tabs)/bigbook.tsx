import { StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { Bookmark } from 'lucide-react-native';
import BigBookBrowser from "@/components/BigBookBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering');
  const navigation = useNavigation();
  const [bookmarksListVisible, setBookmarksListVisible] = useState(false);
  const [hasBookmarks, setHasBookmarks] = useState(false);
  
  const handleBookmarksPress = () => {
    setBookmarksListVisible(true);
  };
  
  // Add bookmark button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleBookmarksPress}
          style={styles.headerButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Bookmark 
            size={24} 
            color={hasBookmarks ? Colors.light.tint : Colors.light.muted}
            fill={hasBookmarks ? Colors.light.tint : 'none'}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, hasBookmarks]);
  
  return (
    <ScreenContainer style={styles.container} noPadding>
      <BigBookBrowser 
        bookmarksListVisible={bookmarksListVisible}
        setBookmarksListVisible={setBookmarksListVisible}
        setHasBookmarks={setHasBookmarks}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
});