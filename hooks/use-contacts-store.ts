// Reach Out — net-new, local-first store of people the user can quickly call or
// text. Each saved contact is just a name + phone, added via the OS contact
// picker (see lib/pickContact). Mirrors use-meetings-store. No server (local
// only) — see DATA-SOURCES.md.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { setProfile } from '@/lib/analytics';

export type Contact = { id: string; name: string; phone: string };

const STORAGE_KEY = 'reach_out_contacts_v1';

// Keep only digits and a leading +, so tel:/sms: links dial cleanly.
export function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}

// Display only — storage keeps what was entered/picked, and dialing goes
// through normalizePhone. US/NANP numbers read as (555) 555-0101; anything
// else (international, short codes, extensions) is shown untouched.
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const hasPlus = phone.trim().startsWith('+');
  if (!hasPlus && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1') && (hasPlus || /^\s*1/.test(phone))) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export const [ContactsProvider, useContacts] = createContextHook(() => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setContacts(JSON.parse(stored));
      } catch (e) {
        console.warn('[contacts] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)).catch((e) => console.warn('[contacts] save failed', e));
  }, [contacts, loaded]);

  // Add a contact; skip (return null) if the same phone number is already saved.
  const addContact = useCallback(
    (c: Omit<Contact, 'id'>): string | null => {
      const key = normalizePhone(c.phone);
      if (key && contacts.some((x) => normalizePhone(x.phone) === key)) return null;
      const id = `c${Date.now()}${Math.floor(Math.random() * 999)}`;
      setContacts((prev) => {
        const next = [...prev, { ...c, id }];
        setProfile({ contacts_count: next.length }); // names/numbers never leave the device
        return next;
      });
      return id;
    },
    [contacts],
  );

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => {
      const next = prev.filter((x) => x.id !== id);
      setProfile({ contacts_count: next.length });
      return next;
    });
  }, []);

  return useMemo(
    () => ({ contacts, addContact, removeContact, loaded }),
    [contacts, addContact, removeContact, loaded],
  );
});
