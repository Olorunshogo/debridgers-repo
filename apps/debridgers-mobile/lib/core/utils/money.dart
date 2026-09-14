import 'package:intl/intl.dart';

/// Formats kobo (integer, backend's only currency unit) as a naira display
/// string. Never store or pass around the naira value this returns - it
/// exists for UI text only.
String formatNaira(int kobo) {
  final NumberFormat formatter = NumberFormat.currency(
    locale: 'en_NG',
    symbol: '₦',
    decimalDigits: 2,
  );
  return formatter.format(kobo / 100);
}
