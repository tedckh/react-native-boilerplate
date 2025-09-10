import { QueryProvider } from '@my-rn-boilerplate/query-provider';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InfiniteListScreen from './src/screens/InfiniteListScreen';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <QueryProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f4511e',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="List" component={InfiniteListScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </QueryProvider>
  );
}

export default App;