import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { diagnoseIssue } from '../services/api';
import { DiagnoseResponse } from '../types';
import DiagnosisCards from '../components/DiagnosisCards';

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePickPhoto() {
    Alert.alert('Select Photo', 'Choose how to add your photo', [
      { text: 'Take Photo', onPress: handleCamera },
      { text: 'Choose from Library', onPress: handleLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    applyPickerResult(picked);
  }

  async function handleLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select photos.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    applyPickerResult(picked);
  }

  function applyPickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    setImageBase64(asset.base64 ?? null);
    const ext = asset.uri.split('.').pop()?.toLowerCase();
    setMimeType(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    setResult(null);
    setError(null);
  }

  async function handleDiagnose() {
    if (description.trim().length < 6) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const diagnosis = await diagnoseIssue(imageBase64, mimeType, description.trim());
      setResult(diagnosis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setImageUri(null);
    setImageBase64(null);
    setMimeType('image/jpeg');
    setDescription('');
    setResult(null);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DI-MY</Text>
          <Text style={styles.headerSubtitle}>DIY Repair Assistant</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo picker */}
          <TouchableOpacity
            style={[styles.photoBox, imageUri ? styles.photoBoxFilled : null]}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={48} color="#FF6B35" />
                <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
                <Text style={styles.photoPlaceholderSub}>Camera or photo library</Text>
              </View>
            )}
          </TouchableOpacity>

          {imageUri && (
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto}>
              <Ionicons name="refresh-outline" size={16} color="#FF6B35" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}

          {/* Description input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Describe the problem</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Leaking pipe under sink, dripping for 2 days..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Diagnose button */}
          <TouchableOpacity
            style={[styles.diagnoseBtn, (description.trim().length < 6 || loading) && styles.diagnoseBtnDisabled]}
            onPress={handleDiagnose}
            disabled={description.trim().length < 6 || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="search-outline" size={20} color="#fff" />
                <Text style={styles.diagnoseBtnText}>Diagnose Issue</Text>
              </>
            )}
          </TouchableOpacity>

          {loading && (
            <Text style={styles.loadingText}>
              {imageBase64 ? 'Analyzing your photo with AI...' : 'Analyzing your description with AI...'}
            </Text>
          )}

          {/* Error state */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#c0392b" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Results */}
          {result && (
            <View style={styles.results}>
              <DiagnosisCards result={result} />
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.resetBtnText}>New Diagnosis</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  flex: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  photoBox: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  photoBoxFilled: {
    borderStyle: 'solid',
    borderColor: '#FF6B35',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  photoPlaceholderSub: {
    fontSize: 13,
    color: '#888',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  changePhotoText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  inputSection: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 80,
  },
  charCount: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'right',
    marginTop: 4,
  },
  diagnoseBtn: {
    marginTop: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  diagnoseBtnDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  diagnoseBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
  },
  errorText: {
    flex: 1,
    color: '#c0392b',
    fontSize: 14,
    lineHeight: 20,
  },
  results: {
    marginTop: 24,
  },
  resetBtn: {
    marginTop: 20,
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPad: {
    height: 40,
  },
});
