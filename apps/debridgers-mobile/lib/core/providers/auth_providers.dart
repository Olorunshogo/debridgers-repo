import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_exception.dart';
import '../network/models/auth_models.dart';
import '../network/repositories/auth_repository.dart';
import '../network/token_storage.dart';
import '../session/user_session.dart';
import 'network_providers.dart';

/// Holds the current [AuthUser], or null when signed out. Widgets read this
/// first and fall back to [UserSession.currentUser] where no provider is in
/// scope - see the class doc there.
class AuthController extends StateNotifier<AsyncValue<AuthUser?>> {
  AuthController(this._authRepository, this._tokenStorage)
      : super(const AsyncValue.data(null)) {
    _restoreSession();
  }

  final AuthRepository _authRepository;
  final TokenStorage _tokenStorage;

  Future<void> _restoreSession() async {
    final String? token = await _tokenStorage.getAccessToken();
    if (token == null) {
      state = const AsyncValue.data(null);
      return;
    }
    /*
     * There is no cross-role "/auth/me" endpoint - buyer and agent profiles
     * live on separate routes (GET /buyer/me, GET /agent/me). Restoring the
     * session from a stored token therefore trusts the last AuthUser this
     * app cached rather than refetching one here.
     */
    state = AsyncValue.data(UserSession.currentUser);
  }

  Future<AuthUser> login({required String email, required String password}) async {
    state = const AsyncValue.loading();
    try {
      final LoginResponse response = await _authRepository.login(
        email: email,
        password: password,
      );
      await _tokenStorage.saveTokens(
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      );
      UserSession.currentUser = response.user;
      state = AsyncValue.data(response.user);
      return response.user;
    } on ApiException catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _authRepository.logout();
    } on ApiException {
      // Best-effort - the session ends locally either way.
    }
    await _tokenStorage.clear();
    UserSession.currentUser = null;
    state = const AsyncValue.data(null);
  }
}

final StateNotifierProvider<AuthController, AsyncValue<AuthUser?>> authStateProvider =
    StateNotifierProvider<AuthController, AsyncValue<AuthUser?>>((ref) {
  return AuthController(
    ref.watch(authRepositoryProvider),
    ref.watch(tokenStorageProvider),
  );
});
