import '../../models/buyer/wallet_models.dart';

abstract class BuyerWalletRepository {
  Future<BuyerWalletSnapshot> getWallet({int page = 1, int limit = 10});
}
