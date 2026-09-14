import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../network/datasources/auth_remote_data_source.dart';
import '../network/repositories/auth_repository.dart';
import '../network/repositories/auth_repository_impl.dart';
import '../network/token_storage.dart';

final Provider<TokenStorage> tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage();
});

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
});

final Provider<AuthRemoteDataSource> authRemoteDataSourceProvider =
    Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(ref.watch(apiClientProvider));
});

final Provider<AuthRepository> authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(ref.watch(authRemoteDataSourceProvider));
});
