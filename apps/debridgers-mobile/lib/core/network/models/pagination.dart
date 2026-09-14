num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

/// `page`/`limit`/`total` as returned inline under a response's `data` key
/// (e.g. buyer orders, wallet transactions) - not the envelope-level `meta`
/// the web api-client's `apiFetchPaged` reads, which this app's endpoints
/// don't use.
class OffsetPagination {
  const OffsetPagination({
    required this.page,
    required this.limit,
    required this.total,
  });

  factory OffsetPagination.fromJson(Map<String, dynamic> json) {
    return OffsetPagination(
      page: _toNum(json['page']).toInt(),
      limit: _toNum(json['limit']).toInt(),
      total: _toNum(json['total']).toInt(),
    );
  }

  final int page;
  final int limit;
  final int total;

  bool get hasNextPage => page * limit < total;
}
