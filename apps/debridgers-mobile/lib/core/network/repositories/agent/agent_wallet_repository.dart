import '../../models/agent/agent_wallet_models.dart';

abstract class AgentWalletRepository {
  Future<AgentWallet> getWallet();
}
