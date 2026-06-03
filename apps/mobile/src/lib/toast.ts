import {Platform, ToastAndroid, Alert} from 'react-native';
import {ApiError} from '@lib/api';

export function showToast(message: string, duration: 'short' | 'long' = 'short') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, duration === 'short' ? ToastAndroid.SHORT : ToastAndroid.LONG);
  } else {
    Alert.alert('', message);
  }
}

/** Shows a clear toast if the error is a network/connectivity failure. */
export function showErrorToast(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') {
      showToast("Can't reach server — check your connection", 'long');
    } else if (error.code === 'UNAUTHORIZED') {
      showToast('Session expired — please log in again', 'long');
    } else {
      showToast(error.message, 'long');
    }
  } else if (error instanceof Error) {
    showToast(error.message, 'long');
  } else {
    showToast('Something went wrong', 'short');
  }
}
