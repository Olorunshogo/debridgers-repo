import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/providers/auth_providers.dart';
import '../../../../../core/session/user_session.dart';
import '../../../stock/presentation/pages/agent_stock_page.dart';
import '../../../wallet/presentation/pages/agent_wallet_page.dart';
import 'agent_overview_page.dart';

class AgentDashboardPage extends ConsumerStatefulWidget {
  const AgentDashboardPage({super.key});

  @override
  ConsumerState<AgentDashboardPage> createState() => _AgentDashboardPageState();
}

class _AgentDashboardPageState extends ConsumerState<AgentDashboardPage> {
  int _tabIndex = 0;

  static const List<Widget> _tabs = [
    AgentOverviewPage(),
    AgentStockPage(),
    AgentWalletPage(),
  ];

  @override
  Widget build(BuildContext context) {
    final String name = UserSession.currentUser?.firstName ?? 'Agent';

    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, $name'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authStateProvider.notifier).logout(),
          ),
        ],
      ),
      body: _tabs[_tabIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (int index) => setState(() => _tabIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Overview'),
          NavigationDestination(icon: Icon(Icons.inventory_2), label: 'Stock'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
        ],
      ),
    );
  }
}
