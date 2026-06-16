import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useDeviceLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return null;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      return loc;
    } catch (e: any) {
        setErrorMsg(e.message);
        return null;
    }
  };

  return { location, errorMsg, requestLocation };
}
