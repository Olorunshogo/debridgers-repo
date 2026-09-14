import '../../datasources/agent/agent_wallet_remote_data_source.dart';
import '../../models/agent/agent_wallet_models.dart';
import 'agent_wallet_repository.dart';

class AgentWalletRepositoryImpl implements AgentWalletRepository {
  AgentWalletRepositoryImpl(this._dataSource);

  final AgentWalletRemoteDataSource _dataSource;

  @override
  Future<AgentWallet> getWallet() => _dataSource.getWallet();
}
