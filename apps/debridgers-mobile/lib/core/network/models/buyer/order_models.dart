num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

/// Mirrors `order_status` in
/// `apps/debridgers-backend/src/infrastructure/persistence/schemas/orders.schema.ts`.
enum OrderStatus { pending, confirmed, outForDelivery, delivered, cancelled }

OrderStatus _orderStatusFromJson(String value) {
  return OrderStatus.values.firstWhere(
    (OrderStatus status) => status.name == _camelCase(value),
    orElse: () => OrderStatus.pending,
  );
}

String _camelCase(String snake) {
  final List<String> parts = snake.split('_');
  return parts.first +
      parts.skip(1).map((String p) => p.isEmpty ? p : p[0].toUpperCase() + p.substring(1)).join();
}

enum PaymentStatus { unpaid, awaiting, paid, failed }

PaymentStatus _paymentStatusFromJson(String value) {
  return PaymentStatus.values.firstWhere(
    (PaymentStatus status) => status.name == value,
    orElse: () => PaymentStatus.unpaid,
  );
}

/// One row from `GET /buyer/orders`, which returns the raw `orders` table
/// rows rather than a mapped shape - only the fields this app's list screen
/// needs are pulled out here. See `orders.schema.ts` for the full row.
class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.orderReference,
    required this.status,
    required this.paymentStatus,
    required this.quantity,
    required this.totalAmountKobo,
    required this.deliveryAddress,
    required this.createdAt,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: _toNum(json['id']).toInt(),
      orderReference: json['order_reference'] as String,
      status: _orderStatusFromJson(json['status'] as String),
      paymentStatus: _paymentStatusFromJson(json['payment_status'] as String),
      quantity: _toNum(json['quantity']).toInt(),
      totalAmountKobo: _toNum(json['total_amount']).toInt(),
      deliveryAddress: json['delivery_address'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final String orderReference;
  final OrderStatus status;
  final PaymentStatus paymentStatus;
  final int quantity;
  final int totalAmountKobo;
  final String deliveryAddress;
  final DateTime createdAt;
}

/// One line from `GET /buyer/orders/:id`'s `items` array.
class OrderItem {
  const OrderItem({
    required this.productId,
    required this.name,
    required this.unit,
    required this.qty,
    required this.unitPriceKobo,
    required this.subtotalKobo,
    this.imageUrl,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: _toNum(json['product_id']).toInt(),
      name: json['name'] as String,
      unit: json['unit'] as String,
      imageUrl: json['image_url'] as String?,
      qty: _toNum(json['qty']).toInt(),
      unitPriceKobo: _toNum(json['unit_price']).toInt(),
      subtotalKobo: _toNum(json['subtotal']).toInt(),
    );
  }

  final int productId;
  final String name;
  final String unit;
  final String? imageUrl;
  final int qty;
  final int unitPriceKobo;
  final int subtotalKobo;
}

/// The mapped shape from `GET /buyer/orders/:id` - richer than
/// [OrderSummary] because this endpoint joins in product and zone names.
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.items,
    required this.subtotalKobo,
    required this.deliveryFeeKobo,
    required this.totalKobo,
    required this.deliveryAddress,
    required this.zoneName,
    required this.createdAt,
    required this.estimatedDelivery,
    required this.trackingUrl,
  });

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    return OrderDetail(
      id: _toNum(json['id']).toInt(),
      status: _orderStatusFromJson(json['status'] as String),
      paymentMethod: json['payment_method'] as String,
      paymentStatus: _paymentStatusFromJson(json['payment_status'] as String),
      items: (json['items'] as List<dynamic>)
          .map((dynamic item) => OrderItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      subtotalKobo: _toNum(json['subtotal_kobo']).toInt(),
      deliveryFeeKobo: _toNum(json['delivery_fee_kobo']).toInt(),
      totalKobo: _toNum(json['total_kobo']).toInt(),
      deliveryAddress: json['delivery_address'] as String,
      zoneName: json['zone_name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      estimatedDelivery: DateTime.parse(json['estimated_delivery'] as String),
      trackingUrl: json['tracking_url'] as String,
    );
  }

  final int id;
  final OrderStatus status;
  final String paymentMethod;
  final PaymentStatus paymentStatus;
  final List<OrderItem> items;
  final int subtotalKobo;
  final int deliveryFeeKobo;
  final int totalKobo;
  final String deliveryAddress;
  final String zoneName;
  final DateTime createdAt;
  final DateTime estimatedDelivery;
  final String trackingUrl;
}
