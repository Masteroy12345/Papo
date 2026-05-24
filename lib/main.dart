import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// State & Theme Imports
import 'state/app_state.dart';
import 'theme/app_theme.dart';

// Screens Imports
import 'screens/auth_screens.dart';
import 'screens/main_screens.dart';
import 'screens/offline_screens.dart';
import 'screens/kyc_screens.dart';
import 'screens/security_screens.dart';
import 'screens/notifications_screens.dart';
import 'screens/merchant_screens.dart';
import 'screens/admin_screens.dart';
import 'screens/extra_screens.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const PaypointApp(),
    ),
  );
}

class PaypointApp extends StatelessWidget {
  const PaypointApp({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return MaterialApp(
      title: 'PAYPOINT (PAPO)',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: appState.themeMode,
      home: const ScreenRouter(),
    );
  }
}

class ScreenRouter extends StatelessWidget {
  const ScreenRouter({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    // Simple router switching between screens based on string state
    switch (appState.currentScreen) {
      // Auth Flow
      case "Splash":
        return const SplashScreen();
      case "Onboarding":
        return const OnboardingScreen();
      case "Login":
        return const LoginScreen();
      case "Register":
        return const RegisterScreen();
      case "OTP":
        return const OtpScreen();
      case "ForgotPassword":
        return const ForgotPasswordScreen();
      case "ResetPassword":
        return const ResetPasswordScreen();
      case "BiometricLogin":
        return const BiometricLoginScreen();
        
      // Main Flow
      case "Dashboard":
        return const DashboardScreen();
      case "Wallet":
        return const WalletScreen();
      case "SendMoney":
        return const SendMoneyScreen();
      case "ReceiveMoney":
        return const ReceiveMoneyScreen();
      case "History":
        return const HistoryScreen();
        
      // Offline Flow
      case "OfflinePayment":
        return const OfflinePaymentScreen();
      case "Sync":
        return const SyncScreen();
        
      // KYC Flow
      case "UploadCNI":
        return const UploadCNIScreen();
      case "UploadPassport":
        return const UploadPassportScreen();
      case "FaceVerification":
        return const FaceVerificationScreen();
      case "KYCStatus":
        return const KYCStatusScreen();
        
      // Security Flow
      case "SecuritySettings":
        return const SecuritySettingsScreen();
        
      // Notifications
      case "NotificationsList":
        return const NotificationsListScreen();
        
      // Custom Dashboards
      case "MerchantDashboard":
        return const MerchantDashboardScreen();
      case "AdminDashboard":
        return const AdminDashboardScreen();
        
      // Extra Ecosystem & Menu Flow
      case "Menu":
        return const MenuScreen();
      case "Circle":
        return const CircleScreen();
      case "Aide":
        return const AideScreen();
      case "Developer":
        return const DeveloperScreen();
      case "Ecosystem":
        return const EcosystemScreen();
      case "Profile":
        return const ProfileScreen();
      case "Blockchain":
        return const BlockchainScreen();
        
      default:
        return const SplashScreen();
    }
  }
}
