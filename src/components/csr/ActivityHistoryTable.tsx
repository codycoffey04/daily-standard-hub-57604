import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useCSRActivities, useDeleteCSRActivity, ALL_ACTIVITY_LABELS } from '@/hooks/useCSRActivities';

interface ActivityHistoryTableProps {
  csrProfileId?: string;
  isManager?: boolean;
}

const PAGE_SIZE = 10;

export const ActivityHistoryTable = ({ csrProfileId, isManager = false }: ActivityHistoryTableProps) => {
  const [page, setPage] = useState(1);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const { data, isLoading } = useCSRActivities({
    csrProfileId: isManager ? undefined : csrProfileId,
    activityType: activityFilter === 'all' ? undefined : activityFilter,
    page,
    pageSize: PAGE_SIZE
  });

  const deleteActivity = useDeleteCSRActivity();

  const activities = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDelete = async (activityId: string) => {
    await deleteActivity.mutateAsync(activityId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Activity History</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {Object.entries(ALL_ACTIVITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="font-medium">
                    {ALL_ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                  </div>
                  {activity.verification_id && (
                    <div className="text-sm">#{activity.verification_id}</div>
                  )}
                  {activity.notes && (
                    <div className="text-xs text-muted-foreground">{activity.notes}</div>
                  )}
                  {isManager && activity.csr_name && (
                    <div className="text-sm text-muted-foreground">
                      CSR: {activity.csr_name}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-primary">
                      +{activity.points} pts
                    </span>
                    {isManager && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {activity.points} points. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(activity.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    {isManager && <TableHead>CSR</TableHead>}
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    {isManager && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {ALL_ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                      </TableCell>
                      {isManager && (
                        <TableCell>{activity.csr_name || '-'}</TableCell>
                      )}
                      <TableCell>
                        {activity.verification_id && (
                          <div className="text-sm">#{activity.verification_id}</div>
                        )}
                        {activity.notes && (
                          <div className="text-xs text-muted-foreground">{activity.notes}</div>
                        )}
                        {!activity.verification_id && !activity.notes && '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        +{activity.points}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove {activity.points} points from {activity.csr_name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(activity.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
