num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

/// `GET /agent/wallet`.
class AgentWallet {
  const AgentWallet({
    required this.id,
    required this.agentId,
    required this.availableBalanceKobo,
    required this.pendingBalanceKobo,
    required this.updatedAt,
  });

  factory AgentWallet.fromJson(Map<String, dynamic> json) {
    return AgentWallet(
      id: _toNum(json['id']).toInt(),
      agentId: _toNum(json['agent_id']).toInt(),
      availableBalanceKobo: _toNum(json['available_balance']).toInt(),
      pendingBalanceKobo: _toNum(json['pending_balance']).toInt(),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  final int id;
  final int agentId;
  final int availableBalanceKobo;
  final int pendingBalanceKobo;
  final DateTime updatedAt;
}
