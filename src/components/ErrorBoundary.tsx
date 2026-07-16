import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { ShieldAlert, RotateCcw } from 'lucide-react-native';
import { useAppStore } from '../services/store';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    resetCount: 0,
  };

  private static readonly MAX_RESETS = 3;

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, resetCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    const { resetCount } = this.state;
    if (resetCount >= ErrorBoundary.MAX_RESETS) {
      // Prevent infinite retry loops — stop showing the retry button
      return;
    }

    // Reset Zustand store to initial state to clear problematic state
    useAppStore.setState({
      userId: null,
      profile: null,
      queue: [],
      currentIndex: 0,
      totalInQueue: 0,
      completedCount: 0,
      online: true,
      isLoading: false,
      isSubmittingReview: false,
    });

    this.setState({ hasError: false, error: null, resetCount: resetCount + 1 });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.card}>
            <ShieldAlert size={64} color="#FF453A" style={styles.icon} />
            <Text style={styles.title}>Đã xảy ra lỗi hệ thống</Text>
            <Text style={styles.subtitle}>
              Ứng dụng gặp một sự cố không mong muốn. Vui lòng bấm thử lại để tiếp tục học tập.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.devErrorBox}>
                <Text style={styles.devErrorTitle}>Debug Info (Dev Only):</Text>
                <Text style={styles.devErrorText}>{this.state.error.toString()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  devErrorBox: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD60A',
    marginBottom: 4,
  },
  devErrorText: {
    fontSize: 12,
    color: '#FF453A',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF2D55',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 24,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
