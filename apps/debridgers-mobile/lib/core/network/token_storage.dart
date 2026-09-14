import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Access/refresh token persistence.
///
/// NOTE(backend, 2026-09-13): the web client keeps these in cookies because
/// the browser can send them same-origin; a mobile client has no cookie jar
/// the backend can see, so tokens travel as an `Authorization: Bearer`
/// header instead and live here in secure storage rather than in cookies.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _accessTokenKey = 'debridgers.access_token';
  static const String _refreshTokenKey = 'debridgers.refresh_token';

  final FlutterSecureStorage _storage;

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
