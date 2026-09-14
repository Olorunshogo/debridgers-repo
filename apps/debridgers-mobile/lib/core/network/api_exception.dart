/// One field-level validation error, as returned in the backend's
/// `errors` array on a 400 from a Zod-validated route.
class ApiFieldError {
  const ApiFieldError({required this.field, required this.message});

  factory ApiFieldError.fromJson(Map<String, dynamic> json) {
    return ApiFieldError(
      field: json['field'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }

  final String field;
  final String message;
}

/// The only exception UI code should ever catch. Repositories and
/// datasources let every DioException convert into one of these so a widget
/// never has to know the transport used underneath.
class ApiException implements Exception {
  ApiException(
    this.statusCode,
    this.message, {
    this.errors,
    this.code,
  });

  final int statusCode;
  final String message;
  final List<ApiFieldError>? errors;
  final String? code;

  bool get isUnauthorized => statusCode == 401;
  bool get isValidation => statusCode == 400;

  @override
  String toString() => 'ApiException($statusCode, $message)';
}
