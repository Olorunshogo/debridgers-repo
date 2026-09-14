import '../../models/agent/stock_models.dart';

abstract class AgentStockRepository {
  Future<List<Product>> getProducts();

  Future<List<StockRequest>> getStockRequests();

  Future<StockRequestReceipt> requestStock({required int productId, required int quantity});
}
