import '../../models/buyer/order_models.dart';

abstract class BuyerOrderRepository {
  Future<List<OrderSummary>> getOrders();

  Future<OrderDetail> getOrder(int orderId);

  Future<void> cancelOrder(int orderId, String reason);
}
