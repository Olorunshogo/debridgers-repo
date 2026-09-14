import 'package:flutter/material.dart';

/// Mirrors `libs/shared-theme/src/tokens.css`. Keep both in sync by hand -
/// this app has no build step that reads the web tokens.
class AppColors {
  const AppColors._();

  // Brand
  static const Color primary = Color(0xFF1E5925);
  static const Color primaryLight = Color(0xFF4B7A51);
  static const Color secondary = Color(0xFFEF9E0B);
  static const Color secondaryLight = Color(0xFFFEF3C7);

  // Base
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);

  // Headings
  static const Color headingColour = Color(0xFF111827);
  static const Color headingColour2 = Color(0xFF010A12);

  // Text
  static const Color textColour = Color(0xFF414652);
  static const Color textColour2 = Color(0xFFA5BDA8);
  static const Color textPlaceholder = Color(0xFF969393);

  // Status
  static const Color goodGreen = Color(0xFF07FF07);
  static const Color errorRed = Color(0xFFFF0707);
  static const Color warningYellow = Color(0xFFFFFB01);

  // Backgrounds
  static const Color bgGray = Color(0xFFF5F5F5);
  static const Color bgLight = Color(0xFFF4F7F5);

  // Borders
  static const Color borderGray = Color(0xFFD9D9D9);

  // Input
  static const Color inputBorder = Color(0xFFD1D5DB);
  static const Color inputBorderFocus = Color(0xFF1A4A2E);
  static const Color inputErrorRed = Color(0xFFEF4444);

  // Icons
  static const Color iconPrimary = Color(0xFF1E1E1E);
  static const Color iconSecondary = Color(0xFF757575);
  static const Color iconTertiary = Color(0xFFB3B3B3);

  // Dashboard status badges
  static const Color statusOnTheWayBg = Color(0xFFFEF3C7);
  static const Color statusOnTheWayText = Color(0xFFB45309);
  static const Color statusDeliveredBg = Color(0xFFDCFCE7);
  static const Color statusDeliveredText = Color(0xFF15803D);
  static const Color statusCancelledBg = Color(0xFFFEE2E2);
  static const Color statusCancelledText = Color(0xFFDC2626);
  static const Color statusActiveBg = Color(0xFFDCFCE7);
  static const Color statusActiveText = Color(0xFF15803D);
  static const Color statusPendingBg = Color(0xFFFEF9C3);
  static const Color statusPendingText = Color(0xFF854D0E);

  // Dashboard UI
  static const Color dashSidebarBg = Color(0xFF1E5925);
  static const Color dashTopbarBg = Color(0xFFFFFFFF);
  static const Color dashPageBg = Color(0xFFF3F3F3);
}
