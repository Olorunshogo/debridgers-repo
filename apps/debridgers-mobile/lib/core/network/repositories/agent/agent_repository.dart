import '../../models/agent/agent_models.dart';

abstract class AgentRepository {
  Future<AgentProfile> getProfile();

  Future<AgentDashboardStats> getDashboardStats();
}
