/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */
// import styled from 'styled-components/native'
import React from 'react'
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native'

import { Colors } from 'react-native/Libraries/NewAppScreen'
import { styled } from './stryled'

const Button = styled(TouchableOpacity)`
  --color: ${() => '#ff0000'};
  --color-2: var(--color);

  padding: 16;
`

const ButtonText = styled(Text)`
  font-size: 50;
  color: var(--color-2);

  .unknownProperty {
    z-index: 100;

    .hi {
      width: 40;
    }

    .hello {
      height: 80;
    }
  }
`

const App = () => {
  const isDarkMode = useColorScheme() === 'dark'

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <Button style={{}} activeOpacity={0.5}>
        <ButtonText>Hello world!</ButtonText>
      </Button>
    </SafeAreaView>
  )
}

export default App
