import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner = ({ isAuth = false }: { isAuth?: boolean }) => {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View 
      className={`bg-red-500 pt-1.5 px-4 z-50 items-center justify-center flex-row`} 
      style={{ paddingTop: Math.max(insets.top, 8) + (isAuth ? 32 : 0) }}
    >
      <Text className="text-white text-xs font-bold text-center">
        No Internet Connection
      </Text>
    </View>
  );
};
