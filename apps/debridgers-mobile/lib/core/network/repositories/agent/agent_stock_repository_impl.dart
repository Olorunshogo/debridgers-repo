import '../../datasources/agent/agent_stock_remote_data_source.dart';
import '../../models/agent/stock_models.dart';
import 'agent_stock_repository.dart';

class AgentStockRepositoryImpl implements AgentStockRepository {
  AgentStockRepositoryImpl(this._dataSource);

  final AgentStockRemoteDataSource _dataSource;

  @override
  Future<List<Product>> getProducts() => _dataSource.getProducts();

  @override
  Future<List<StockRequest>> getStockRequests() => _dataSource.getStockRequests();

  @override
  Future<StockRequestReceipt> requestStock({required int productId, required int quantity}) =>
      _dataSource.requestStock(productId: productId, quantity: quantity);
}
