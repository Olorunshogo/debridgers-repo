import '../../datasources/buyer/buyer_wallet_remote_data_source.dart';
import '../../models/buyer/wallet_models.dart';
import 'buyer_wallet_repository.dart';

class BuyerWalletRepositoryImpl implements BuyerWalletRepository {
  BuyerWalletRepositoryImpl(this._dataSource);

  final BuyerWalletRemoteDataSource _dataSource;

  @override
  Future<BuyerWalletSnapshot> getWallet({int page = 1, int limit = 10}) =>
      _dataSource.getWallet(page: page, limit: limit);
}
