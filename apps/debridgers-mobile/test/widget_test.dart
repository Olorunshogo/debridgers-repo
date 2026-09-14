import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:debridgers_app/app.dart';

void main() {
  testWidgets('shows the login form when signed out', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: DebridgersApp()));
    await tester.pump();

    expect(find.text('Log in'), findsOneWidget);
  });
}
