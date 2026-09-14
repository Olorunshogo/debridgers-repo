import '../../api_client.dart';
import '../../models/agent/agent_wallet_models.dart';

class AgentWalletRemoteDataSource {
  AgentWalletRemoteDataSource(this._client);

  final ApiClient _client;

  Future<AgentWallet> getWallet() {
    return _client.get(
      '/agent/wallet',
      fromJson: (dynamic json) => AgentWallet.fromJson(json as Map<String, dynamic>),
    );
  }
}
