import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/agent/stock_models.dart';
import '../../../../../core/providers/agent_providers.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/utils/money.dart';

class AgentStockPage extends ConsumerWidget {
  const AgentStockPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<Product>> products = ref.watch(agentProductsProvider);
    final AsyncValue<List<StockRequest>> requests = ref.watch(agentStockRequestsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(agentProductsProvider);
        ref.invalidate(agentStockRequestsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Products', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          products.when(
            data: (List<Product> list) => Column(
              children: [
                for (final Product product in list)
                  Card(
                    child: ListTile(
                      title: Text(product.name),
                      subtitle: Text('${formatNaira(product.priceKobo)} / ${product.unit}'),
                      trailing: FilledButton(
                        onPressed: () => _showRequestDialog(context, ref, product),
                        child: const Text('Request'),
                      ),
                    ),
                  ),
              ],
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (Object error, StackTrace stackTrace) => _ErrorText(error: error),
          ),
          const SizedBox(height: 24),
          Text('My stock requests', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          requests.when(
            data: (List<StockRequest> list) {
              if (list.isEmpty) return const Text('No stock requests yet');
              return Column(
                children: [
                  for (final StockRequest request in list)
                    Card(
                      child: ListTile(
                        title: Text('${request.quantity} units • ${request.status.name}'),
                        subtitle: Text(
                          'Outstanding: ${formatNaira(request.outstandingKobo)}',
                        ),
                      ),
                    ),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (Object error, StackTrace stackTrace) => _ErrorText(error: error),
          ),
        ],
      ),
    );
  }

  Future<void> _showRequestDialog(BuildContext context, WidgetRef ref, Product product) async {
    final TextEditingController quantityController = TextEditingController(text: '1');

    final int? quantity = await showDialog<int>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Text('Request ${product.name}'),
          content: TextField(
            controller: quantityController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final int? parsed = int.tryParse(quantityController.text);
                Navigator.of(dialogContext).pop(parsed);
              },
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );

    if (quantity == null || quantity < 1 || !context.mounted) return;

    try {
      final StockRequestReceipt receipt = await ref
          .read(agentStockRepositoryProvider)
          .requestStock(productId: product.id, quantity: quantity);
      ref.invalidate(agentStockRequestsProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Requested ${receipt.quantity} ${receipt.productUnit} of ${receipt.productName}',
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }
}

class _ErrorText extends StatelessWidget {
  const _ErrorText({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    final String message = error is ApiException
        ? (error as ApiException).message
        : 'Something went wrong';
    return Text(message, style: const TextStyle(color: AppColors.errorRed));
  }
}
