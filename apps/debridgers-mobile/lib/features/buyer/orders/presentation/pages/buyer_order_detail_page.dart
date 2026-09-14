import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/buyer/order_models.dart';
import '../../../../../core/providers/buyer_providers.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/utils/money.dart';

class BuyerOrderDetailPage extends ConsumerWidget {
  const BuyerOrderDetailPage({required this.orderId, super.key});

  final int orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<OrderDetail> detail = ref.watch(buyerOrderDetailProvider(orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: detail.when(
        data: (OrderDetail order) => _OrderDetailBody(order: order),
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

class _OrderDetailBody extends StatelessWidget {
  const _OrderDetailBody({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Status: ${order.status.name}', style: Theme.of(context).textTheme.bodyMedium),
        Text('Delivery address: ${order.deliveryAddress}'),
        Text('Zone: ${order.zoneName}'),
        const Divider(height: 32),
        for (final OrderItem item in order.items)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(item.name),
            subtitle: Text('${item.qty} x ${item.unit}'),
            trailing: Text(formatNaira(item.subtotalKobo)),
          ),
        const Divider(height: 32),
        _SummaryRow(label: 'Subtotal', valueKobo: order.subtotalKobo),
        _SummaryRow(label: 'Delivery fee', valueKobo: order.deliveryFeeKobo),
        _SummaryRow(label: 'Total', valueKobo: order.totalKobo, emphasize: true),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.valueKobo,
    this.emphasize = false,
  });

  final String label;
  final int valueKobo;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final TextStyle? style = emphasize
        ? Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)
        : Theme.of(context).textTheme.bodyMedium;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(formatNaira(valueKobo), style: style),
        ],
      ),
    );
  }
}
