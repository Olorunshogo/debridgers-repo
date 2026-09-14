import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/buyer/order_models.dart';
import '../../../../../core/providers/buyer_providers.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/utils/money.dart';
import 'buyer_order_detail_page.dart';

class BuyerOrdersPage extends ConsumerWidget {
  const BuyerOrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<OrderSummary>> orders = ref.watch(buyerOrdersProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(buyerOrdersProvider.future),
      child: orders.when(
        data: (List<OrderSummary> list) {
          if (list.isEmpty) {
            return const Center(child: Text('No orders yet'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (BuildContext context, int index) {
              final OrderSummary order = list[index];
              return Card(
                child: ListTile(
                  title: Text(order.orderReference),
                  subtitle: Text(
                    '${order.status.name} • ${formatNaira(order.totalAmountKobo)}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => BuyerOrderDetailPage(orderId: order.id),
                    ),
                  ),
                ),
              );
            },
          );
        },
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
