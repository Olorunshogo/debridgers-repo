num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

num? _toNumOrNull(dynamic value) {
  if (value == null) return null;
  return _toNum(value);
}

DateTime? _dateOrNull(dynamic value) {
  if (value == null) return null;
  return DateTime.parse(value as String);
}

/// `GET /agent/products` - active products an agent can request stock of.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.priceKobo,
    required this.stockQuantity,
    this.categoryId,
    this.categoryName,
    this.description,
    this.imageUrl,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: _toNum(json['id']).toInt(),
      name: json['name'] as String,
      unit: json['unit'] as String,
      priceKobo: _toNum(json['price_kobo']).toInt(),
      stockQuantity: _toNum(json['stock_quantity']).toInt(),
      categoryId: _toNumOrNull(json['category_id'])?.toInt(),
      categoryName: json['category_name'] as String?,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
    );
  }

  final int id;
  final String name;
  final String unit;
  final int priceKobo;
  final int stockQuantity;
  final int? categoryId;
  final String? categoryName;
  final String? description;
  final String? imageUrl;
}

/// Mirrors `stock_request_status` in
/// `stock_requests.schema.ts`.
enum StockRequestStatus { pending, fulfilled, cancelled }

StockRequestStatus _statusFromJson(String value) {
  return StockRequestStatus.values.firstWhere(
    (StockRequestStatus status) => status.name == value,
  );
}

/// One row from `GET /agent/stock`.
class StockRequest {
  const StockRequest({
    required this.id,
    required this.agentId,
    required this.quantity,
    required this.status,
    required this.amountToRemitKobo,
    required this.amountRemittedKobo,
    required this.createdAt,
    this.productId,
    this.fulfilledAt,
    this.updatedAt,
  });

  factory StockRequest.fromJson(Map<String, dynamic> json) {
    return StockRequest(
      id: _toNum(json['id']).toInt(),
      agentId: _toNum(json['agent_id']).toInt(),
      productId: _toNumOrNull(json['product_id'])?.toInt(),
      quantity: _toNum(json['quantity']).toInt(),
      status: _statusFromJson(json['status'] as String),
      amountToRemitKobo: _toNum(json['amount_to_remit']).toInt(),
      amountRemittedKobo: _toNum(json['amount_remitted']).toInt(),
      fulfilledAt: _dateOrNull(json['fulfilled_at']),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: _dateOrNull(json['updated_at']),
    );
  }

  final int id;
  final int agentId;
  final int? productId;
  final int quantity;
  final StockRequestStatus status;
  final int amountToRemitKobo;
  final int amountRemittedKobo;
  final DateTime? fulfilledAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

  int get outstandingKobo => amountToRemitKobo - amountRemittedKobo;
}

/// The response of `POST /agent/stock/request` - not the same shape as a
/// [StockRequest] row (no `agent_id`, `amount_remitted` or `created_at`
/// come back here), so it gets its own model rather than reusing that one.
class StockRequestReceipt {
  const StockRequestReceipt({
    required this.id,
    required this.productName,
    required this.productUnit,
    required this.quantity,
    required this.amountToRemitKobo,
    required this.status,
  });

  factory StockRequestReceipt.fromJson(Map<String, dynamic> json) {
    return StockRequestReceipt(
      id: _toNum(json['id']).toInt(),
      productName: json['product_name'] as String,
      productUnit: json['product_unit'] as String,
      quantity: _toNum(json['quantity']).toInt(),
      amountToRemitKobo: _toNum(json['amount_to_remit']).toInt(),
      status: _statusFromJson(json['status'] as String),
    );
  }

  final int id;
  final String productName;
  final String productUnit;
  final int quantity;
  final int amountToRemitKobo;
  final StockRequestStatus status;
}
