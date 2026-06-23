// Reach Out — net-new, local-first store of people the user can quickly call or
// text. Each saved contact is just a name + phone, added via the OS contact
// picker (see lib/pickContact). Mirrors use-meetings-store. No server (local
// only) — see DATA-SOURCES.md.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type Contact = { id: string; name: string; phone: string };

const STORAGE_KEY = 'reach_out_contacts_v1';

// Keep only digits and a leading +, so tel:/sms: links dial cleanly.
export function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
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
      setContacts((prev) => [...prev, { ...c, id }]);
      return id;
    },
    [contacts],
  );

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return useMemo(
    () => ({ contacts, addContact, removeContact, loaded }),
    [contacts, addContact, removeContact, loaded],
  );
});
