import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/agent/agent_wallet_models.dart';
import '../../../../../core/providers/agent_providers.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/utils/money.dart';

class AgentWalletPage extends ConsumerWidget {
  const AgentWalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<AgentWallet> wallet = ref.watch(agentWalletProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(agentWalletProvider.future),
      child: wallet.when(
        data: (AgentWallet data) => ListView(
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
                      formatNaira(data.availableBalanceKobo),
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
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                title: const Text('Pending balance'),
                trailing: Text(formatNaira(data.pendingBalanceKobo)),
              ),
            ),
          ],
        ),
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
