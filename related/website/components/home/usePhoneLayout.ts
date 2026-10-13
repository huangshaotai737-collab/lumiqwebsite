"use client";

import {useSyncExternalStore} from 'react';

const phoneQuery = '(max-width: 767px)';
function subscribe(listener: () => void) {
  const query = window.matchMedia(phoneQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export function usePhoneLayout() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(phoneQuery).matches, () => false);
}
