import * as Keychain from 'react-native-keychain';

const SERVICE = 'in.neuralife.teacher';

export const SecureStorage = {
  async setToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('jwt', token, {service: SERVICE});
  },

  async getToken(): Promise<string | null> {
    const creds = await Keychain.getGenericPassword({service: SERVICE});
    if (!creds) return null;
    return creds.password;
  },

  async clearToken(): Promise<void> {
    await Keychain.resetGenericPassword({service: SERVICE});
  },
};
