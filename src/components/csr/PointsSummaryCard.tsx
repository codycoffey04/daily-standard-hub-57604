import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Phone, FileText, Star, Shield, Users, RefreshCw } from 'lucide-react';

interface PointsBreakdown {
  referral_closed_pts: number;
  referral_quoted_pts: number;
  google_review_pts: number;
  retention_save_pts: number;
  new_customer_referral_pts: number;
  winback_closed_pts: number;
  winback_quoted_pts: number;
  total_points: number;
  activity_count: number;
}

interface PointsSummaryCardProps {
  data: PointsBreakdown | null;
  isLoading?: boolean;
}

const activityTypes = [
  {
    key: 'referral_closed_pts',
    label: 'Referral Closed',
    icon: Phone,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    pointValue: 15
  },
  {
    key: 'referral_quoted_pts',
    label: 'Referral Quoted',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    pointValue: 5
  },
  {
    key: 'google_review_pts',
    label: 'Google Review',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    pointValue: 10
  },
  {
    key: 'retention_save_pts',
    label: 'Retention Save',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    pointValue: 10
  },
  {
    key: 'new_customer_referral_pts',
    label: 'New Customer Referral',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    pointValue: 10
  },
  {
    key: 'winback_closed_pts',
    label: 'Winback Closed',
    icon: RefreshCw,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    pointValue: 10
  },
  {
    key: 'winback_quoted_pts',
    label: 'Winback Quoted',
    icon: RefreshCw,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    pointValue: 3
  }
];

export const PointsSummaryCard = ({ data, isLoading }: PointsSummaryCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Points Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPoints = data?.total_points || 0;
  const activityCount = data?.activity_count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Points Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Points Display */}
        <div className="text-center py-4 mb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <div className="text-4xl font-bold text-primary">{totalPoints}</div>
          <div className="text-sm text-muted-foreground">
            Total Points ({activityCount} {activityCount === 1 ? 'activity' : 'activities'})
          </div>
        </div>

        {/* Breakdown by Activity Type */}
        <div className="space-y-2">
          {activityTypes.map((type) => {
            const points = data?.[type.key as keyof PointsBreakdown] as number || 0;
            const count = points > 0 ? Math.round(points / type.pointValue) : 0;
            const Icon = type.icon;

            return (
              <div
                key={type.key}
                className={`flex items-center justify-between p-3 rounded-lg ${type.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${type.color}`} />
                  <div>
                    <div className="text-sm font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {type.pointValue} pts each
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${type.color}`}>{points} pts</div>
                  {count > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {count} {count === 1 ? 'activity' : 'activities'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
