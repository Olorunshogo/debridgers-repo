import '../../datasources/buyer/buyer_order_remote_data_source.dart';
import '../../models/buyer/order_models.dart';
import 'buyer_order_repository.dart';

class BuyerOrderRepositoryImpl implements BuyerOrderRepository {
  BuyerOrderRepositoryImpl(this._dataSource);

  final BuyerOrderRemoteDataSource _dataSource;

  @override
  Future<List<OrderSummary>> getOrders() => _dataSource.getOrders();

  @override
  Future<OrderDetail> getOrder(int orderId) => _dataSource.getOrder(orderId);

  @override
  Future<void> cancelOrder(int orderId, String reason) =>
      _dataSource.cancelOrder(orderId, reason);
}
