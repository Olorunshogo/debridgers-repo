import '../../api_client.dart';
import '../../models/agent/stock_models.dart';

class AgentStockRemoteDataSource {
  AgentStockRemoteDataSource(this._client);

  final ApiClient _client;

  Future<List<Product>> getProducts() {
    return _client.get(
      '/agent/products',
      fromJson: (dynamic json) => (json as List<dynamic>)
          .map((dynamic product) => Product.fromJson(product as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<List<StockRequest>> getStockRequests() {
    return _client.get(
      '/agent/stock',
      fromJson: (dynamic json) => (json as List<dynamic>)
          .map((dynamic request) => StockRequest.fromJson(request as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<StockRequestReceipt> requestStock({required int productId, required int quantity}) {
    return _client.post(
      '/agent/stock/request',
      data: {'product_id': productId, 'quantity': quantity},
      fromJson: (dynamic json) => StockRequestReceipt.fromJson(json as Map<String, dynamic>),
    );
  }
}
