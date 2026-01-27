import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CSRPeriod } from '@/hooks/useCSRPoints';

interface PeriodSelectorProps {
  period: CSRPeriod;
  onPeriodChange: (period: CSRPeriod) => void;
}

export const PeriodSelector = ({ period, onPeriodChange }: PeriodSelectorProps) => {
  return (
    <Tabs value={period} onValueChange={(value) => onPeriodChange(value as CSRPeriod)}>
      <TabsList>
        <TabsTrigger value="week">This Week</TabsTrigger>
        <TabsTrigger value="month">This Month</TabsTrigger>
        <TabsTrigger value="ytd">Year to Date</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
