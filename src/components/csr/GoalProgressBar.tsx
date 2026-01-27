import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { CSRPeriod } from '@/hooks/useCSRPoints';

interface GoalProgressBarProps {
  currentPoints: number;
  period: CSRPeriod;
  goals: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export const GoalProgressBar = ({ currentPoints, period, goals }: GoalProgressBarProps) => {
  const goalMap: Record<CSRPeriod, { label: string; target: number }> = {
    week: { label: 'Weekly Goal', target: goals.weekly },
    month: { label: 'Monthly Goal', target: goals.monthly },
    ytd: { label: 'Yearly Goal', target: goals.yearly }
  };

  const { label, target } = goalMap[period];
  const progress = Math.min((currentPoints / target) * 100, 100);
  const pointsToGo = Math.max(target - currentPoints, 0);
  const isGoalMet = currentPoints >= target;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress
            value={progress}
            className={`h-3 ${isGoalMet ? '[&>div]:bg-green-500' : ''}`}
          />
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {currentPoints} / {target} pts
            </span>
            {isGoalMet ? (
              <span className="text-green-600 font-medium">Goal Met!</span>
            ) : (
              <span className="text-muted-foreground">
                {pointsToGo} pts to go
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
