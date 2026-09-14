import '../models/auth_models.dart';

abstract class AuthRepository {
  Future<LoginResponse> login({required String email, required String password});

  Future<AuthUser> register(RegisterPayload payload);

  Future<void> logout();

  Future<void> forgotPassword(String email);
}
