import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/datasources/buyer/buyer_order_remote_data_source.dart';
import '../network/datasources/buyer/buyer_wallet_remote_data_source.dart';
import '../network/models/buyer/order_models.dart';
import '../network/models/buyer/wallet_models.dart';
import '../network/repositories/buyer/buyer_order_repository.dart';
import '../network/repositories/buyer/buyer_order_repository_impl.dart';
import '../network/repositories/buyer/buyer_wallet_repository.dart';
import '../network/repositories/buyer/buyer_wallet_repository_impl.dart';
import 'network_providers.dart';

final Provider<BuyerOrderRemoteDataSource> buyerOrderRemoteDataSourceProvider =
    Provider<BuyerOrderRemoteDataSource>((ref) {
  return BuyerOrderRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<BuyerOrderRepository> buyerOrderRepositoryProvider =
    Provider<BuyerOrderRepository>((ref) {
  return BuyerOrderRepositoryImpl(ref.watch(buyerOrderRemoteDataSourceProvider));
});

final AutoDisposeFutureProvider<List<OrderSummary>> buyerOrdersProvider =
    FutureProvider.autoDispose<List<OrderSummary>>((ref) {
  return ref.watch(buyerOrderRepositoryProvider).getOrders();
});

final AutoDisposeFutureProviderFamily<OrderDetail, int> buyerOrderDetailProvider =
    FutureProvider.autoDispose.family<OrderDetail, int>((ref, orderId) {
  return ref.watch(buyerOrderRepositoryProvider).getOrder(orderId);
});

final Provider<BuyerWalletRemoteDataSource> buyerWalletRemoteDataSourceProvider =
    Provider<BuyerWalletRemoteDataSource>((ref) {
  return BuyerWalletRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<BuyerWalletRepository> buyerWalletRepositoryProvider =
    Provider<BuyerWalletRepository>((ref) {
  return BuyerWalletRepositoryImpl(ref.watch(buyerWalletRemoteDataSourceProvider));
});

final AutoDisposeFutureProvider<BuyerWalletSnapshot> buyerWalletProvider =
    FutureProvider.autoDispose<BuyerWalletSnapshot>((ref) {
  return ref.watch(buyerWalletRepositoryProvider).getWallet();
});
