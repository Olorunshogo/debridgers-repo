import '../pagination.dart';

num _toNum(dynamic value) {
  if (value is num) return value;
  if (value is String) return num.parse(value);
  throw FormatException('Expected a number, got $value');
}

class BuyerWallet {
  const BuyerWallet({
    required this.id,
    required this.availableBalanceKobo,
    required this.pendingBalanceKobo,
    required this.totalDepositedKobo,
  });

  factory BuyerWallet.fromJson(Map<String, dynamic> json) {
    return BuyerWallet(
      id: _toNum(json['id']).toInt(),
      availableBalanceKobo: _toNum(json['available_balance']).toInt(),
      pendingBalanceKobo: _toNum(json['pending_balance']).toInt(),
      totalDepositedKobo: _toNum(json['total_deposited']).toInt(),
    );
  }

  final int id;
  final int availableBalanceKobo;
  final int pendingBalanceKobo;
  final int totalDepositedKobo;
}

/// Mirrors `wallet_transaction_type` in
/// `wallet_transactions.schema.ts`.
enum WalletTransactionType { deposit, withdraw, refund }

WalletTransactionType _typeFromJson(String value) {
  return WalletTransactionType.values.firstWhere(
    (WalletTransactionType type) => type.name == value,
  );
}

/// Mirrors `wallet_transaction_status` in the same schema file.
enum WalletTransactionStatus { pending, completed, failed }

WalletTransactionStatus _statusFromJson(String value) {
  return WalletTransactionStatus.values.firstWhere(
    (WalletTransactionStatus status) => status.name == value,
  );
}

class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.walletId,
    required this.type,
    required this.amountKobo,
    required this.status,
    required this.createdAt,
    this.reference,
    this.description,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: _toNum(json['id']).toInt(),
      walletId: _toNum(json['wallet_id']).toInt(),
      type: _typeFromJson(json['type'] as String),
      amountKobo: _toNum(json['amount']).toInt(),
      status: _statusFromJson(json['status'] as String),
      reference: json['reference'] as String?,
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final int walletId;
  final WalletTransactionType type;
  final int amountKobo;
  final WalletTransactionStatus status;
  final String? reference;
  final String? description;
  final DateTime createdAt;
}

/// The `data` payload of `GET /buyer/wallet` - wallet balances plus one
/// page of transaction history. Named `Snapshot` rather than `Page` so it
/// doesn't collide with the `BuyerWalletPage` screen widget.
class BuyerWalletSnapshot {
  const BuyerWalletSnapshot({
    required this.wallet,
    required this.transactions,
    required this.pagination,
  });

  factory BuyerWalletSnapshot.fromJson(Map<String, dynamic> json) {
    return BuyerWalletSnapshot(
      wallet: BuyerWallet.fromJson(json['wallet'] as Map<String, dynamic>),
      transactions: (json['transactions'] as List<dynamic>)
          .map((dynamic tx) => WalletTransaction.fromJson(tx as Map<String, dynamic>))
          .toList(),
      pagination: OffsetPagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final BuyerWallet wallet;
  final List<WalletTransaction> transactions;
  final OffsetPagination pagination;
}
