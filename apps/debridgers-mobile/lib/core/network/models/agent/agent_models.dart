num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

/// `GET /agent/me`.
class AgentProfile {
  const AgentProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.status,
    required this.kycStatus,
    required this.lga,
    required this.address,
    required this.target,
    required this.referralBuyerCode,
    required this.referralAgentCode,
    required this.isStateManager,
  });

  factory AgentProfile.fromJson(Map<String, dynamic> json) {
    return AgentProfile(
      id: _toNum(json['id']).toInt(),
      firstName: json['first_name'] as String,
      lastName: json['last_name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
      status: json['status'] as String,
      kycStatus: json['kyc_status'] as String,
      lga: json['lga'] as String,
      address: json['address'] as String,
      target: _toNum(json['target']).toInt(),
      referralBuyerCode: json['referral_buyer_code'] as String,
      referralAgentCode: json['referral_agent_code'] as String,
      isStateManager: json['is_state_manager'] as bool? ?? false,
    );
  }

  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String status;
  final String kycStatus;
  final String lga;
  final String address;
  final int target;
  final String referralBuyerCode;
  final String referralAgentCode;
  final bool isStateManager;

  String get fullName => '$firstName $lastName';
}

/// One row from `GET /agent/reports`, and one entry of `recent_reports` on
/// the dashboard endpoint.
///
/// NOTE(backend, 2026-09-13): `amount` comes back as a decimal string
/// (Postgres numeric column serialised by the ORM), not a number - never
/// cast it directly.
class AgentReport {
  const AgentReport({
    required this.id,
    required this.agentId,
    required this.pagesSold,
    required this.amount,
    required this.createdAt,
    this.notes,
  });

  factory AgentReport.fromJson(Map<String, dynamic> json) {
    return AgentReport(
      id: _toNum(json['id']).toInt(),
      agentId: _toNum(json['agent_id']).toInt(),
      pagesSold: _toNum(json['pages_sold']).toInt(),
      amount: _toNum(json['amount']),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final int agentId;
  final int pagesSold;
  final num amount;
  final String? notes;
  final DateTime createdAt;
}

/// `GET /agent/dashboard`.
class AgentDashboardStats {
  const AgentDashboardStats({
    required this.totalBagsSold,
    required this.totalEarned,
    required this.rank,
    required this.daysReported,
    required this.commissionPending,
    required this.recentReports,
  });

  factory AgentDashboardStats.fromJson(Map<String, dynamic> json) {
    return AgentDashboardStats(
      totalBagsSold: _toNum(json['total_bags_sold']).toInt(),
      totalEarned: _toNum(json['total_earned']),
      rank: _toNum(json['rank']).toInt(),
      daysReported: _toNum(json['days_reported']).toInt(),
      commissionPending: _toNum(json['commission_pending']),
      recentReports: (json['recent_reports'] as List<dynamic>)
          .map((dynamic report) => AgentReport.fromJson(report as Map<String, dynamic>))
          .toList(),
    );
  }

  final int totalBagsSold;
  final num totalEarned;
  final int rank;
  final int daysReported;
  final num commissionPending;
  final List<AgentReport> recentReports;
}
