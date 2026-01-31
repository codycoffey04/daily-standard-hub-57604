import { useState } from 'react';
import { Award } from 'lucide-react';
import { useCSRPoints, useCSRPointsConfig, useCurrentCSRProfile, CSRPeriod } from '@/hooks/useCSRPoints';
import { useCSRLeaderboard } from '@/hooks/useCSRLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyRoles } from '@/lib/roles';
import { useQuery } from '@tanstack/react-query';
import {
  PeriodSelector,
  PointsSummaryCard,
  CSRLeaderboard,
  GoalProgressBar,
  ActivityLogForm,
  ActivityHistoryTable
} from '@/components/csr';
import { CoachingDashboardCard } from '@/components/coaching/CoachingDashboardCard';

const CSRDashboardPage = () => {
  const [period, setPeriod] = useState<CSRPeriod>('ytd');
  const { profile } = useAuth();

  // Check if user is a manager
  const { data: roles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: fetchMyRoles
  });
  const isManager = roles?.has('owner') || roles?.has('manager') || false;

  // Get current CSR profile (if user is a CSR)
  const { data: currentProfile } = useCurrentCSRProfile();

  // Get points data for current CSR or all if manager
  const { data: pointsData, isLoading: pointsLoading } = useCSRPoints(
    period,
    currentProfile?.csr_profile_id
  );

  // Get leaderboard data
  const { data: leaderboardData, isLoading: leaderboardLoading } = useCSRLeaderboard();

  // Get points config (goals)
  const { data: config } = useCSRPointsConfig();

  // Find current user's points in the data
  const currentUserPoints = currentProfile?.csr_profile_id
    ? pointsData?.find((p) => p.csr_profile_id === currentProfile.csr_profile_id)
    : pointsData?.[0];

  // If no specific profile, show first CSR's data (for managers viewing)
  const displayPoints = currentUserPoints || (pointsData?.length ? pointsData[0] : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">CSR Dashboard</h1>
            {currentProfile && (
              <p className="text-muted-foreground">
                Welcome, {currentProfile.display_name}
              </p>
            )}
            {isManager && !currentProfile && (
              <p className="text-muted-foreground">
                Manager View
              </p>
            )}
          </div>
        </div>
        <PeriodSelector period={period} onPeriodChange={setPeriod} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Points Summary & Activity History (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <PointsSummaryCard data={displayPoints || null} isLoading={pointsLoading} />

          {/* Activity History Table */}
          <ActivityHistoryTable
            csrProfileId={currentProfile?.csr_profile_id}
            isManager={isManager}
          />
        </div>

        {/* Right Column - Activity Log, Goal & Leaderboard (1/3 width on large screens) */}
        <div className="space-y-6">
          {/* Activity Log Form - Only show if user has a CSR profile */}
          {currentProfile?.csr_profile_id && (
            <ActivityLogForm csrProfileId={currentProfile.csr_profile_id} />
          )}

          {/* Coaching Scorecard - Only renders if current week episode exists */}
          {currentProfile?.csr_profile_id && (
            <CoachingDashboardCard
              memberId={currentProfile.csr_profile_id}
              memberName={currentProfile.display_name}
              coachingType="service"
              isCsr={true}
            />
          )}

          <GoalProgressBar
            currentPoints={displayPoints?.total_points || 0}
            period={period}
            goals={config?.goals || { weekly: 10, monthly: 40, yearly: 480 }}
          />
          <CSRLeaderboard
            data={leaderboardData || []}
            period={period}
            currentUserId={currentProfile?.csr_profile_id}
            isLoading={leaderboardLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default CSRDashboardPage;
