import '../api_client.dart';
import '../models/auth_models.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource(this._client);

  final ApiClient _client;

  Future<LoginResponse> login({
    required String email,
    required String password,
  }) {
    return _client.post(
      '/auth/login',
      data: {'email': email, 'password': password},
      fromJson: (dynamic json) => LoginResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<AuthUser> register(RegisterPayload payload) {
    return _client.post(
      '/auth/register',
      data: payload.toJson(),
      fromJson: (dynamic json) =>
          AuthUser.fromJson((json as Map<String, dynamic>)['user'] as Map<String, dynamic>),
    );
  }

  Future<void> logout() {
    return _client.post('/auth/logout', fromJson: (_) {});
  }

  Future<void> forgotPassword(String email) {
    return _client.post(
      '/auth/forgot-password',
      data: {'email': email},
      fromJson: (_) {},
    );
  }
}
