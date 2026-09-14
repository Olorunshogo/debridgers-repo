import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/datasources/agent/agent_remote_data_source.dart';
import '../network/datasources/agent/agent_stock_remote_data_source.dart';
import '../network/datasources/agent/agent_wallet_remote_data_source.dart';
import '../network/models/agent/agent_models.dart';
import '../network/models/agent/agent_wallet_models.dart';
import '../network/models/agent/stock_models.dart';
import '../network/repositories/agent/agent_repository.dart';
import '../network/repositories/agent/agent_repository_impl.dart';
import '../network/repositories/agent/agent_stock_repository.dart';
import '../network/repositories/agent/agent_stock_repository_impl.dart';
import '../network/repositories/agent/agent_wallet_repository.dart';
import '../network/repositories/agent/agent_wallet_repository_impl.dart';
import 'network_providers.dart';

final Provider<AgentRemoteDataSource> agentRemoteDataSourceProvider =
    Provider<AgentRemoteDataSource>((ref) {
  return AgentRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<AgentRepository> agentRepositoryProvider = Provider<AgentRepository>((ref) {
  return AgentRepositoryImpl(ref.watch(agentRemoteDataSourceProvider));
});

final AutoDisposeFutureProvider<AgentProfile> agentProfileProvider =
    FutureProvider.autoDispose<AgentProfile>((ref) {
  return ref.watch(agentRepositoryProvider).getProfile();
});

final AutoDisposeFutureProvider<AgentDashboardStats> agentDashboardProvider =
    FutureProvider.autoDispose<AgentDashboardStats>((ref) {
  return ref.watch(agentRepositoryProvider).getDashboardStats();
});

final Provider<AgentStockRemoteDataSource> agentStockRemoteDataSourceProvider =
    Provider<AgentStockRemoteDataSource>((ref) {
  return AgentStockRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<AgentStockRepository> agentStockRepositoryProvider =
    Provider<AgentStockRepository>((ref) {
  return AgentStockRepositoryImpl(ref.watch(agentStockRemoteDataSourceProvider));
});

final AutoDisposeFutureProvider<List<Product>> agentProductsProvider =
    FutureProvider.autoDispose<List<Product>>((ref) {
  return ref.watch(agentStockRepositoryProvider).getProducts();
});

final AutoDisposeFutureProvider<List<StockRequest>> agentStockRequestsProvider =
    FutureProvider.autoDispose<List<StockRequest>>((ref) {
  return ref.watch(agentStockRepositoryProvider).getStockRequests();
});

final Provider<AgentWalletRemoteDataSource> agentWalletRemoteDataSourceProvider =
    Provider<AgentWalletRemoteDataSource>((ref) {
  return AgentWalletRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<AgentWalletRepository> agentWalletRepositoryProvider =
    Provider<AgentWalletRepository>((ref) {
  return AgentWalletRepositoryImpl(ref.watch(agentWalletRemoteDataSourceProvider));
});

final AutoDisposeFutureProvider<AgentWallet> agentWalletProvider =
    FutureProvider.autoDispose<AgentWallet>((ref) {
  return ref.watch(agentWalletRepositoryProvider).getWallet();
});
