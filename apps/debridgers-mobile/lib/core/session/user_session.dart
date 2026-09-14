import '../network/models/auth_models.dart';

/// Static fallback for the current user, read where a widget has no
/// [WidgetRef] to reach `authStateProvider` (e.g. a repository, a plain
/// Dart class, a callback fired outside the widget tree). Widgets should
/// prefer the provider and fall back to this singleton:
/// `ref.watch(authStateProvider).value ?? UserSession.currentUser`.
class UserSession {
  UserSession._();

  static AuthUser? currentUser;
}
