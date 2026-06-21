import React from 'react';
import { useRouter } from 'expo-router';
import SoberDateEditor from '@/components/SoberDateEditor';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

export default function SoberDateScreen() {
  const router = useRouter();
  const { sobrietyDate, setSobrietyDate, removeSobrietyDate } = useSobriety();
  useScreenTimeTracking('Sober Date');

  return (
    <SoberDateEditor
      current={sobrietyDate ? parseLocalDate(sobrietyDate) : null}
      onBack={() => router.back()}
      onSave={(date) => {
        setSobrietyDate(formatLocalDate(date));
        router.back();
      }}
      onRemove={
        sobrietyDate
          ? () => {
              removeSobrietyDate();
              router.back();
            }
          : undefined
      }
    />
  );
}
