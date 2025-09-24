// Stripe Alternative MVP - React Native (Expo) Frontend
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { createClient } from '@supabase/supabase-js';

// Configuration - Updated with your deployed backend
const SUPABASE_URL = 'https://mock-project.supabase.co'; // Mock mode - no real Supabase needed
const SUPABASE_ANON_KEY = 'mock-anon-key'; // Mock mode
const BACKEND_URL = 'https://stripe-alt-backend-d8czhwstayhp.deno.dev'; // Your actual Deno Deploy URL

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [paymentType, setPaymentType] = useState('');

  // Demo user ID - in production, this would come from authentication
  const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Mock mode - simulate user data
      setUser({ id: DEMO_USER_ID, email: 'demo@example.com' });
      
      // Mock subscription data - start with pending status
      setSubscription({
        id: 'mock-subscription-id',
        user_id: DEMO_USER_ID,
        plan: 'premium',
        status: 'pending',
        current_period_end: null,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    try {
      setPaymentLoading(true);

      // Get client session from backend
      const response = await fetch(`${BACKEND_URL}/api/primer/client-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 2999, // $29.99 in cents
          currency: 'USD',
          userId: DEMO_USER_ID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Create Primer Universal Checkout HTML
      const primerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://sdk.primer.io/web/v2/primer.js"></script>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              padding: 20px; 
              margin: 0;
            }
            #primer-container { 
              max-width: 400px; 
              margin: 0 auto; 
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            .plan {
              color: #666;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="amount">$29.99</div>
            <div class="plan">Premium Subscription</div>
          </div>
          <div id="primer-container"></div>
          
          <script>
            Primer.initialize({
              clientToken: '${data.clientToken}',
              onTokenizeSuccess: function(paymentMethodToken) {
                // Send payment method token to your backend
                fetch('${BACKEND_URL}/api/primer/create-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paymentMethodToken: paymentMethodToken,
                    amount: 2999,
                    currency: 'USD',
                    userId: '${DEMO_USER_ID}'
                  })
                })
                .then(response => response.json())
                .then(data => {
                  if (data.status === 'AUTHORIZED') {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'PAYMENT_SUCCESS',
                      data: data
                    }));
                  } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'PAYMENT_ERROR',
                      error: 'Payment failed'
                    }));
                  }
                })
                .catch(error => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_ERROR',
                    error: error.message
                  }));
                });
              },
              onError: function(error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PAYMENT_ERROR',
                  error: error.message
                }));
              }
            });

            // Render Universal Checkout
            Primer.render('#primer-container');
          </script>
        </body>
        </html>
      `;

      setWebViewUrl(`data:text/html;base64,${btoa(primerHtml)}`);
      setPaymentType('card');
      setShowWebView(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCryptoPayment = async () => {
    try {
      setPaymentLoading(true);

      // Create crypto charge
      const response = await fetch(`${BACKEND_URL}/api/crypto/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 2999, // $29.99 in cents
          currency: 'USD',
          userId: DEMO_USER_ID,
          plan: 'premium',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create crypto charge');
      }

      // Open Coinbase Commerce hosted checkout
      setWebViewUrl(data.hostedUrl);
      setPaymentType('crypto');
      setShowWebView(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'PAYMENT_SUCCESS') {
        setShowWebView(false);
        Alert.alert('Success', 'Payment completed successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Start polling for subscription update
              pollForSubscriptionUpdate();
            },
          },
        ]);
      } else if (message.type === 'PAYMENT_ERROR') {
        setShowWebView(false);
        Alert.alert('Error', message.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const pollForSubscriptionUpdate = async () => {
    // Mock mode - simulate subscription activation after payment
    setTimeout(() => {
      setSubscription({
        id: 'mock-subscription-id',
        user_id: DEMO_USER_ID,
        plan: 'premium',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });
      Alert.alert('Success', 'Your subscription is now active!');
    }, 2000); // Simulate 2 second processing time
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'No active subscription';
    
    const status = subscription.status;
    const endDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : 'N/A';

    switch (status) {
      case 'active':
        return `Active until ${endDate}`;
      case 'pending':
        return 'Payment pending...';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowWebView(false)}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>
            {paymentType === 'card' ? 'Card Payment' : 'Crypto Payment'}
          </Text>
        </View>
        <WebView
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Demo</Text>
          <Text style={styles.subtitle}>Stripe Alternative MVP</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.subscriptionStatus}>
            Status: {getSubscriptionStatus()}
          </Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Premium Plan</Text>
          <Text style={styles.planPrice}>$29.99/month</Text>
          <Text style={styles.planFeatures}>
            • Unlimited access{'\n'}
            • Priority support{'\n'}
            • Advanced features
          </Text>
        </View>

        <View style={styles.paymentButtons}>
          <TouchableOpacity
            style={[styles.paymentButton, styles.cardButton]}
            onPress={handleCardPayment}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.paymentButtonText}>💳 Pay with Card</Text>
                <Text style={styles.paymentButtonSubtext}>Visa, Mastercard, etc.</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, styles.cryptoButton]}
            onPress={handleCryptoPayment}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.paymentButtonText}>₿ Pay with Crypto</Text>
                <Text style={styles.paymentButtonSubtext}>Bitcoin, Ethereum, etc.</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadUserData}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  planCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginVertical: 10,
  },
  planFeatures: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  paymentButtons: {
    gap: 15,
    marginBottom: 20,
  },
  paymentButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardButton: {
    backgroundColor: '#007AFF',
  },
  cryptoButton: {
    backgroundColor: '#FF9500',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 50, // Offset for close button
  },
  webView: {
    flex: 1,
  },
});
