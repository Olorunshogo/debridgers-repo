import '../../api_client.dart';
import '../../models/buyer/wallet_models.dart';

class BuyerWalletRemoteDataSource {
  BuyerWalletRemoteDataSource(this._client);

  final ApiClient _client;

  Future<BuyerWalletSnapshot> getWallet({int page = 1, int limit = 10}) {
    return _client.get(
      '/buyer/wallet',
      queryParameters: {'page': page, 'limit': limit},
      fromJson: (dynamic json) => BuyerWalletSnapshot.fromJson(json as Map<String, dynamic>),
    );
  }
}
