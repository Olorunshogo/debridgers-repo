import '../../datasources/agent/agent_remote_data_source.dart';
import '../../models/agent/agent_models.dart';
import 'agent_repository.dart';

class AgentRepositoryImpl implements AgentRepository {
  AgentRepositoryImpl(this._dataSource);

  final AgentRemoteDataSource _dataSource;

  @override
  Future<AgentProfile> getProfile() => _dataSource.getProfile();

  @override
  Future<AgentDashboardStats> getDashboardStats() => _dataSource.getDashboardStats();
}
