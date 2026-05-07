import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiagnoseResponse } from '../types';

interface Props {
  result: DiagnoseResponse;
}

const CONFIDENCE_COLORS = {
  low: '#e67e22',
  medium: '#2980b9',
  high: '#27ae60',
};

export default function DiagnosisCards({ result }: Props) {
  return (
    <View style={styles.container}>
      <DiagnosisCard result={result} />
      {result.safetyWarnings.length > 0 && <SafetyCard warnings={result.safetyWarnings} />}
      <ToolsPartsCard tools={result.toolsNeeded} parts={result.partsNeeded} />
      <StepsCard steps={result.repairSteps} />
      {result.productSuggestions.length > 0 && (
        <ProductsCard products={result.productSuggestions} />
      )}
    </View>
  );
}

function DiagnosisCard({ result }: { result: DiagnoseResponse }) {
  const confidenceColor = CONFIDENCE_COLORS[result.confidence];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="medical-outline" size={20} color="#FF6B35" />
        <Text style={styles.cardTitle}>Diagnosis</Text>
      </View>

      <View style={styles.confidenceRow}>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>{result.confidence.toUpperCase()} CONFIDENCE</Text>
        </View>
      </View>

      <Text style={styles.issueText}>{result.likelyIssue}</Text>

      {result.callProfessional && (
        <View style={styles.professionalWarning}>
          <Ionicons name="construct-outline" size={18} color="#c0392b" />
          <View style={styles.flex}>
            <Text style={styles.professionalTitle}>Professional Recommended</Text>
            {result.callProfessionalReason && (
              <Text style={styles.professionalReason}>{result.callProfessionalReason}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function SafetyCard({ warnings }: { warnings: string[] }) {
  return (
    <View style={[styles.card, styles.safetyCard]}>
      <View style={styles.cardHeader}>
        <Ionicons name="warning-outline" size={20} color="#e67e22" />
        <Text style={[styles.cardTitle, { color: '#e67e22' }]}>Safety Warnings</Text>
      </View>
      {warnings.map((warning, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>⚠</Text>
          <Text style={styles.listText}>{warning}</Text>
        </View>
      ))}
    </View>
  );
}

function ToolsPartsCard({ tools, parts }: { tools: string[]; parts: string[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="hammer-outline" size={20} color="#FF6B35" />
        <Text style={styles.cardTitle}>Tools & Parts</Text>
      </View>

      {tools.length > 0 && (
        <>
          <Text style={styles.subheading}>Tools needed</Text>
          {tools.map((tool, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{tool}</Text>
            </View>
          ))}
        </>
      )}

      {parts.length > 0 && (
        <>
          <Text style={[styles.subheading, tools.length > 0 && { marginTop: 12 }]}>
            Parts & materials
          </Text>
          {parts.map((part, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{part}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function StepsCard({ steps }: { steps: string[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="list-outline" size={20} color="#FF6B35" />
        <Text style={styles.cardTitle}>Step-by-Step Fix</Text>
      </View>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step.replace(/^Step \d+:\s*/i, '')}</Text>
        </View>
      ))}
    </View>
  );
}

function ProductsCard({ products }: { products: DiagnoseResponse['productSuggestions'] }) {
  function handleSearch(query: string) {
    const url = `https://www.homedepot.com/s/${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="cart-outline" size={20} color="#FF6B35" />
        <Text style={styles.cardTitle}>Recommended Products</Text>
      </View>
      {products.map((product, i) => (
        <View key={i} style={styles.productItem}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDesc}>{product.description}</Text>
            <Text style={styles.productPrice}>{product.estimatedPrice}</Text>
          </View>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => handleSearch(product.searchQuery)}
            activeOpacity={0.7}
          >
            <Text style={styles.shopBtnText}>Shop</Text>
            <Ionicons name="open-outline" size={14} color="#FF6B35" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  safetyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  confidenceRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  issueText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  professionalWarning: {
    marginTop: 14,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#c0392b',
  },
  professionalTitle: {
    fontWeight: '700',
    color: '#c0392b',
    fontSize: 14,
    marginBottom: 2,
  },
  professionalReason: {
    color: '#c0392b',
    fontSize: 13,
    lineHeight: 18,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: '#FF6B35',
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  productDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  shopBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
