import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/network/models/auth_models.dart';
import 'core/providers/auth_providers.dart';
import 'core/session/user_session.dart';
import 'core/theme/app_theme.dart';
import 'features/agent/dashboard/presentation/pages/agent_dashboard_page.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/buyer/dashboard/presentation/pages/buyer_dashboard_page.dart';

class DebridgersApp extends ConsumerWidget {
  const DebridgersApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Debridgers',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const _RootRouter(),
    );
  }
}

/// Sends a signed-in user to the shell that matches their role, and an
/// anonymous one to login. `agent`/`buyer` are the only self-registerable,
/// field-facing roles - see `SELF_REGISTERABLE_ROLES` in
/// `auth/dto/register.dto.ts`. Admin and company have no mobile surface.
class _RootRouter extends ConsumerWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<AuthUser?> authState = ref.watch(authStateProvider);
    final AuthUser? user = authState.value ?? UserSession.currentUser;

    if (authState.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (user == null) {
      return const LoginPage();
    }

    switch (user.role) {
      case UserRole.agent:
        return const AgentDashboardPage();
      case UserRole.buyer:
      case UserRole.admin:
      case UserRole.company:
        return const BuyerDashboardPage();
    }
  }
}
