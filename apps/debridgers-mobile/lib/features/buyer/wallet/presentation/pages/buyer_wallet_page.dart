import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/buyer/wallet_models.dart';
import '../../../../../core/providers/buyer_providers.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/utils/money.dart';

class BuyerWalletPage extends ConsumerWidget {
  const BuyerWalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<BuyerWalletSnapshot> walletPage = ref.watch(buyerWalletProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(buyerWalletProvider.future),
      child: walletPage.when(
        data: (BuyerWalletSnapshot page) => _WalletBody(page: page),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, StackTrace stackTrace) {
          final String message = error is ApiException ? error.message : 'Something went wrong';
          return Center(
            child: Text(message, style: const TextStyle(color: AppColors.errorRed)),
          );
        },
      ),
    );
  }
}

class _WalletBody extends StatelessWidget {
  const _WalletBody({required this.page});

  final BuyerWalletSnapshot page;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: AppColors.primary,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Available balance', style: TextStyle(color: AppColors.white)),
                const SizedBox(height: 8),
                Text(
                  formatNaira(page.wallet.availableBalanceKobo),
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text('Recent transactions', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        if (page.transactions.isEmpty) const Text('No transactions yet'),
        for (final WalletTransaction tx in page.transactions)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(tx.type.name),
            subtitle: Text(tx.description ?? tx.reference ?? tx.status.name),
            trailing: Text(formatNaira(tx.amountKobo)),
          ),
      ],
    );
  }
}
