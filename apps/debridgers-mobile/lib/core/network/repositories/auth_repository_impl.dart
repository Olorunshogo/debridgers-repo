import '../datasources/auth_remote_data_source.dart';
import '../models/auth_models.dart';
import 'auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._dataSource);

  final AuthRemoteDataSource _dataSource;

  @override
  Future<LoginResponse> login({required String email, required String password}) {
    return _dataSource.login(email: email, password: password);
  }

  @override
  Future<AuthUser> register(RegisterPayload payload) {
    return _dataSource.register(payload);
  }

  @override
  Future<void> logout() {
    return _dataSource.logout();
  }

  @override
  Future<void> forgotPassword(String email) {
    return _dataSource.forgotPassword(email);
  }
}
