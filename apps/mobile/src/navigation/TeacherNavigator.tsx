import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet} from 'react-native';
import {useAuthStore} from '@store/authStore';
import {useSchoolStore} from '@store/schoolStore';
import {Colors} from '@constants/index';
import {NavTabBar} from '@components/ui/NavTabBar';
import type {TeacherTabParamList} from './types';
import {HomeScreen} from '@screens/Teacher/HomeScreen';
import {ClassPickerScreen} from '@screens/Teacher/ClassPickerScreen';
import {MyClassesScreen} from '@screens/Teacher/MyClassesScreen';
import {MyClassScreen} from '@screens/ClassTeacher/MyClassScreen';
import {ChatScreen} from '@screens/Teacher/ChatScreen';
import {ProfileScreen} from '@screens/Teacher/ProfileScreen';

let DevTimePicker: React.ComponentType | null = null;
if (__DEV__) {
  DevTimePicker = require('@components/ui/DevTimePicker').DevTimePicker;
}

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home:       '⌂',
  Attendance: '✓',
  MyClasses:  '📚',
  MyClass:    '🏫',
  Chat:       '💬',
  Profile:    '👤',
};

export function TeacherNavigator() {
  const isClassTeacher = useAuthStore(s => s.isClassTeacher);
  const accentColor    = useSchoolStore(s => s.accentColor);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        tabBar={props => <NavTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tab.Screen name="Home"       component={HomeScreen}        options={{tabBarLabel: 'Home'}} />
        <Tab.Screen name="Attendance" component={ClassPickerScreen} options={{tabBarLabel: 'Attendance'}} />
        <Tab.Screen name="MyClasses"  component={MyClassesScreen}   options={{tabBarLabel: 'My Classes'}} />
        {isClassTeacher && (
          <Tab.Screen name="MyClass" component={MyClassScreen} options={{tabBarLabel: 'My Class'}} />
        )}
        <Tab.Screen name="Chat"    component={ChatScreen}    options={{tabBarLabel: 'Chat'}} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{tabBarLabel: 'Profile'}} />
      </Tab.Navigator>
      {__DEV__ && DevTimePicker ? <DevTimePicker /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
