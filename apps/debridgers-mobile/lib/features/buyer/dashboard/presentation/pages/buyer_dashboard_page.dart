import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/providers/auth_providers.dart';
import '../../../../../core/session/user_session.dart';
import '../../../orders/presentation/pages/buyer_orders_page.dart';
import '../../../wallet/presentation/pages/buyer_wallet_page.dart';

class BuyerDashboardPage extends ConsumerStatefulWidget {
  const BuyerDashboardPage({super.key});

  @override
  ConsumerState<BuyerDashboardPage> createState() => _BuyerDashboardPageState();
}

class _BuyerDashboardPageState extends ConsumerState<BuyerDashboardPage> {
  int _tabIndex = 0;

  static const List<Widget> _tabs = [BuyerOrdersPage(), BuyerWalletPage()];

  @override
  Widget build(BuildContext context) {
    final String name = UserSession.currentUser?.firstName ?? 'Buyer';

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
          NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
        ],
      ),
    );
  }
}
