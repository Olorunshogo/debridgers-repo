import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/network/api_exception.dart';
import '../../../../../core/network/models/agent/agent_models.dart';
import '../../../../../core/providers/agent_providers.dart';
import '../../../../../core/theme/app_colors.dart';

class AgentOverviewPage extends ConsumerWidget {
  const AgentOverviewPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<AgentDashboardStats> stats = ref.watch(agentDashboardProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(agentDashboardProvider.future),
      child: stats.when(
        data: (AgentDashboardStats data) => _OverviewBody(stats: data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, StackTrace stackTrace) {
          final String message = error is ApiException ? error.message : 'Something went wrong';
          return Center(
            child: Text(message, style: const TextStyle(color: AppColors.errorRed)),
          );
        },
      ),
    );
  }
}

class _OverviewBody extends StatelessWidget {
  const _OverviewBody({required this.stats});

  final AgentDashboardStats stats;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: _StatCard(label: 'Bags sold', value: '${stats.totalBagsSold}'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(label: 'Rank', value: '#${stats.rank}'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatCard(label: 'Total earned', value: '₦${stats.totalEarned}'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Commission pending',
                value: '₦${stats.commissionPending}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text('Recent reports', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        if (stats.recentReports.isEmpty) const Text('No reports submitted yet'),
        for (final AgentReport report in stats.recentReports)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('${report.pagesSold} pages sold'),
            subtitle: Text(report.notes ?? ''),
            trailing: Text('₦${report.amount}'),
          ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.textColour)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
