import '../../api_client.dart';
import '../../models/agent/agent_models.dart';

class AgentRemoteDataSource {
  AgentRemoteDataSource(this._client);

  final ApiClient _client;

  Future<AgentProfile> getProfile() {
    return _client.get(
      '/agent/me',
      fromJson: (dynamic json) => AgentProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<AgentDashboardStats> getDashboardStats() {
    return _client.get(
      '/agent/dashboard',
      fromJson: (dynamic json) => AgentDashboardStats.fromJson(json as Map<String, dynamic>),
    );
  }
}
