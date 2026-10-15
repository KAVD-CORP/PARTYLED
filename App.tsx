import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export default function App() {
  const [text, setText] = useState('Type your message here');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  
  const scrollX = useSharedValue(0);
  const textWidth = useRef(0);
  const containerWidth = useRef(Dimensions.get('window').width);
  const scrollViewRef = useRef<ScrollView>(null);

  // Set initial orientation to landscape
  useEffect(() => {
    const setOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    setOrientation();

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Animation effect
  useEffect(() => {
    if (!isPlaying || !textWidth.current) return;

    const totalWidth = textWidth.current + containerWidth.current;
    const duration = (totalWidth / 50) * 1000; // Adjust speed here

    scrollX.value = withRepeat(
      withTiming(-totalWidth, { duration, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      scrollX.value = 0;
    };
  }, [isPlaying, text]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: scrollX.value }],
    };
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTextLayout = (event: any) => {
    textWidth.current = event.nativeEvent.layout.width;
  };

  const handleContainerLayout = (event: any) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  const colors = [
    '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666',
    '#800000', '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
    '#009933', '#0066cc', '#0000ff', '#6600cc', '#9900cc',
  ];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {!isPlaying ? (
        <View style={styles.editorContainer}>
          <Text style={styles.title}>Digital Signboard</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            value={text}
            onChangeText={setText}
            placeholder="Enter your message"
            placeholderTextColor="#666"
            multiline
          />
          
          <View style={styles.controls}>
            <View style={styles.controlGroup}>
              <Text style={[styles.label, { color: textColor }]}>Background Color:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={() => setBgColor(color)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.controlGroup}>
              <Text style={[styles.label, { color: textColor }]}>Text Color:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {colors.reverse().map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={() => setTextColor(color)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.controlGroup}>
              <Text style={[styles.label, { color: textColor }]}>Text Size: {textSize}px</Text>
              <View style={styles.sizeControl}>
                <TouchableOpacity 
                  style={styles.sizeButton} 
                  onPress={() => setTextSize(prev => Math.max(16, prev - 2))}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sizeButton} 
                  onPress={() => setTextSize(prev => Math.min(72, prev + 2))}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <Text style={styles.playButtonText}>PLAY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.fullscreenContainer} 
          onPress={handlePlayPause}
          activeOpacity={1}
          onLayout={handleContainerLayout}
        >
          <Animated.View 
            style={[styles.scrollingTextContainer, animatedStyle]}
            onLayout={handleTextLayout}
          >
            <Text 
              style={[
                styles.scrollingText, 
                { 
                  color: textColor,
                  fontSize: textSize,
                  lineHeight: textSize * 1.5,
                }
              ]}
            >
              {text} • {text} • {text} •
            </Text>
          </Animated.View>
        </TouchableOpacity>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#fff',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  controls: {
    marginBottom: 30,
  },
  controlGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  colorPicker: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  sizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scrollingText: {
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
