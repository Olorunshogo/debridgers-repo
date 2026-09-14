import '../../api_client.dart';
import '../../models/buyer/order_models.dart';

class BuyerOrderRemoteDataSource {
  BuyerOrderRemoteDataSource(this._client);

  final ApiClient _client;

  Future<List<OrderSummary>> getOrders() {
    return _client.get(
      '/buyer/orders',
      fromJson: (dynamic json) => (json as List<dynamic>)
          .map((dynamic order) => OrderSummary.fromJson(order as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<OrderDetail> getOrder(int orderId) {
    return _client.get(
      '/buyer/orders/$orderId',
      fromJson: (dynamic json) => OrderDetail.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> cancelOrder(int orderId, String reason) {
    return _client.post(
      '/buyer/orders/$orderId/cancel',
      data: {'reason': reason},
      fromJson: (_) {},
    );
  }
}
