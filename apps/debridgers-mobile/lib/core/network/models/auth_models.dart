num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

/// Mirrors `packages/api-client/src/types/auth.ts`'s `UserRole`. `company`
/// is not self-registerable but a login can still return it, so it stays in
/// the enum rather than being dropped.
enum UserRole { admin, agent, buyer, company }

UserRole _roleFromJson(String value) {
  return UserRole.values.firstWhere(
    (UserRole role) => role.name == value,
    orElse: () => UserRole.buyer,
  );
}

/// The authenticated user record. See `AuthUser` in
/// `packages/api-client/src/types/auth.ts`.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    required this.isEmailVerified,
    this.phone,
    this.createdAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: _toNum(json['id']).toInt(),
      firstName: json['first_name'] as String,
      lastName: json['last_name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      role: _roleFromJson(json['role'] as String),
      isEmailVerified: json['is_email_verified'] as bool? ?? false,
      createdAt: json['created_at'] as String?,
    );
  }

  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final UserRole role;
  final bool isEmailVerified;
  final String? createdAt;

  String get fullName => '$firstName $lastName';
}

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }

  final String accessToken;
  final String refreshToken;
}

class LoginResponse {
  const LoginResponse({required this.user, required this.tokens});

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokens.fromJson(json),
    );
  }

  final AuthUser user;
  final AuthTokens tokens;
}

/// Outgoing payload for `POST /auth/register`. Optional fields are omitted
/// entirely rather than sent as null - see `registerSchema` in
/// `apps/debridgers-backend/src/api/v1/auth/dto/register.dto.ts`.
class RegisterPayload {
  const RegisterPayload({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    required this.acceptedTerms,
    required this.termsDocument,
    required this.termsVersion,
    this.phone,
    this.referredByAgentCode,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String password;
  final bool acceptedTerms;
  final String termsDocument;
  final String termsVersion;
  final String? phone;
  final String? referredByAgentCode;

  Map<String, dynamic> toJson() {
    return {
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
      'password': password,
      'accepted_terms': acceptedTerms,
      'terms_document': termsDocument,
      'terms_version': termsVersion,
      if (phone != null) 'phone': phone,
      if (referredByAgentCode != null) 'referred_by_agent_code': referredByAgentCode,
    };
  }
}
