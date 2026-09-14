import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'token_storage.dart';

const String _defaultBaseUrl = 'http://localhost:4001/api/v1';

/// Override with `--dart-define=API_BASE_URL=https://api.debridgers.com/api/v1`.
String get apiBaseUrl => const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: _defaultBaseUrl,
    );

/// One request, one silent refresh on 401, one retry - mirrors
/// `packages/api-client/src/apiFetch.ts` and `auth.ts` on the web side, so
/// the two clients cannot drift on how a session is kept alive.
class ApiClient {
  ApiClient({Dio? dio, TokenStorage? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorage(),
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: apiBaseUrl,
                headers: const {'Content-Type': 'application/json'},
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final String? token = await _tokenStorage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (DioException error, handler) async {
          final bool alreadyRetried = error.requestOptions.extra['retried'] == true;
          if (error.response?.statusCode != 401 || alreadyRetried) {
            handler.next(error);
            return;
          }

          try {
            final String accessToken = await _refreshTokens();
            final RequestOptions retryOptions = error.requestOptions
              ..extra['retried'] = true
              ..headers['Authorization'] = 'Bearer $accessToken';
            final Response<dynamic> retryResponse = await _dio.fetch(retryOptions);
            handler.resolve(retryResponse);
          } catch (_) {
            await _tokenStorage.clear();
            handler.next(error);
          }
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /*
   * Two concurrent 401s must share one refresh call, the same way
   * auth.ts's `inFlightRefresh` does on the web - the backend rotates the
   * refresh token on every use, so a second concurrent refresh would fail
   * bcrypt.compare against the hash the first one just replaced.
   */
  Future<String>? _inFlightRefresh;

  Future<String> _refreshTokens() {
    return _inFlightRefresh ??= _performRefresh().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<String> _performRefresh() async {
    final String? refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) {
      throw ApiException(401, 'No refresh token available');
    }

    final Dio refreshDio = Dio(BaseOptions(baseUrl: apiBaseUrl));
    final Response<Map<String, dynamic>> response = await refreshDio.post(
      '/auth/refresh',
      options: Options(headers: {'Authorization': 'Refresh $refreshToken'}),
    );

    final Map<String, dynamic>? data = response.data?['data'] as Map<String, dynamic>?;
    final String? accessToken = data?['accessToken'] as String?;
    final String? newRefreshToken = data?['refreshToken'] as String?;
    if (accessToken == null || newRefreshToken == null) {
      throw ApiException(401, 'Refresh response missing tokens');
    }

    await _tokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    );
    return accessToken;
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic json) fromJson,
  }) {
    return _request(path, method: 'GET', queryParameters: queryParameters, fromJson: fromJson);
  }

  Future<T> post<T>(
    String path, {
    Object? data,
    required T Function(dynamic json) fromJson,
  }) {
    return _request(path, method: 'POST', data: data, fromJson: fromJson);
  }

  Future<T> patch<T>(
    String path, {
    Object? data,
    required T Function(dynamic json) fromJson,
  }) {
    return _request(path, method: 'PATCH', data: data, fromJson: fromJson);
  }

  Future<T> delete<T>(
    String path, {
    Object? data,
    required T Function(dynamic json) fromJson,
  }) {
    return _request(path, method: 'DELETE', data: data, fromJson: fromJson);
  }

  Future<T> _request<T>(
    String path, {
    required String method,
    Map<String, dynamic>? queryParameters,
    Object? data,
    required T Function(dynamic json) fromJson,
  }) async {
    try {
      final Response<Map<String, dynamic>> response = await _dio.request(
        path,
        queryParameters: queryParameters,
        data: data,
        options: Options(method: method),
      );
      return fromJson(response.data?['data']);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  ApiException _toApiException(DioException error) {
    final Response<dynamic>? response = error.response;
    if (response == null) {
      return ApiException(0, error.message ?? 'Network error');
    }

    final dynamic body = response.data;
    final String message = body is Map<String, dynamic>
        ? (body['message'] as String? ?? 'Request failed: ${response.statusCode}')
        : 'Request failed: ${response.statusCode}';
    final List<dynamic>? errorsJson =
        body is Map<String, dynamic> ? body['errors'] as List<dynamic>? : null;
    final String? code = body is Map<String, dynamic> ? body['code'] as String? : null;

    return ApiException(
      response.statusCode ?? 500,
      message,
      errors: errorsJson
          ?.map((dynamic e) => ApiFieldError.fromJson(e as Map<String, dynamic>))
          .toList(),
      code: code,
    );
  }
}
