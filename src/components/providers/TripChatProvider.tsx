"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useCedarStore } from 'cedar-os';

interface TripChatContextType {
  tripId?: string;
  tripData?: any;
}

const TripChatContext = createContext<TripChatContextType>({});

interface TripChatProviderProps {
  children: React.ReactNode;
  tripId?: string;
  tripData?: any;
}

export const TripChatProvider: React.FC<TripChatProviderProps> = ({
  children,
  tripId,
  tripData,
}) => {
  const store = useCedarStore();

  useEffect(() => {
    // Store the trip context in Cedar's store for use by chat components
    if (tripId) {
      console.log('TripChatProvider: Setting trip context with tripId:', tripId);

      // Override the sendMessage method to inject resourceId
      const originalSendMessage = store.sendMessage;
      if (originalSendMessage && typeof originalSendMessage === 'function') {
        console.log('TripChatProvider: Overriding sendMessage method');
        store.sendMessage = (messages: any, options: any = {}) => {
          console.log('TripChatProvider: sendMessage called, injecting resourceId:', tripId);
          console.log('TripChatProvider: original options:', options);

          const updatedOptions = {
            ...options,
            resourceId: tripId,
          };

          console.log('TripChatProvider: updated options:', updatedOptions);
          return originalSendMessage.call(store, messages, updatedOptions);
        };
      } else {
        console.log('TripChatProvider: sendMessage not found or not a function');
      }

      // Also try to set resourceId on the store state
      try {
        if (store.setState && typeof store.setState === 'function') {
          store.setState({ resourceId: tripId });
          console.log('TripChatProvider: Set resourceId via setState');
        }

        // Direct property assignment as fallback
        (store as any).resourceId = tripId;
        console.log('TripChatProvider: Set resourceId as direct property');
      } catch (error) {
        console.warn('TripChatProvider: Failed to set resourceId:', error);
      }
    }
  }, [tripId, store]);

  return (
    <TripChatContext.Provider value={{ tripId, tripData }}>
      {children}
    </TripChatContext.Provider>
  );
};

// Custom hook to use trip context in chat
export const useTripChatContext = () => {
  return useContext(TripChatContext);
};
