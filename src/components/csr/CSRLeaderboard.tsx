import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { CSRPeriod } from '@/hooks/useCSRPoints';

interface LeaderboardEntry {
  rank: number;
  csr_profile_id: string;
  csr_name: string;
  ytd_points: number;
  mtd_points: number;
  wtd_points: number;
}

interface CSRLeaderboardProps {
  data: LeaderboardEntry[];
  period: CSRPeriod;
  currentUserId?: string;
  isLoading?: boolean;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  }
};

const getRankBgColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-50 border-yellow-200';
    case 2:
      return 'bg-gray-50 border-gray-200';
    case 3:
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-background';
  }
};

export const CSRLeaderboard = ({ data, period, currentUserId, isLoading }: CSRLeaderboardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPointsForPeriod = (entry: LeaderboardEntry): number => {
    switch (period) {
      case 'week':
        return entry.wtd_points;
      case 'month':
        return entry.mtd_points;
      case 'ytd':
      default:
        return entry.ytd_points;
    }
  };

  const periodLabel = period === 'week' ? 'WTD' : period === 'month' ? 'MTD' : 'YTD';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((entry) => {
            const points = getPointsForPeriod(entry);
            const isCurrentUser = entry.csr_profile_id === currentUserId;

            return (
              <div
                key={entry.csr_profile_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getRankBgColor(entry.rank)} ${
                  isCurrentUser ? 'ring-2 ring-primary ring-offset-1' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {entry.csr_name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{points} pts</div>
                  <div className="text-xs text-muted-foreground">{periodLabel}</div>
                </div>
              </div>
            );
          })}

          {data.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No CSR data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
