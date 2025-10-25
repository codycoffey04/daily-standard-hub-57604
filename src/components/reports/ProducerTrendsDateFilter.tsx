import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { DateRangePicker } from '@/components/DateRangePicker'
import { today } from '@/lib/timezone'
import dayjs from 'dayjs'

type DatePreset = 'ytd' | 'last30' | 'last60' | 'last90' | 'month' | 'custom'

interface ProducerTrendsDateFilterProps {
  onDateRangeChange: (fromDate: string, toDate: string) => void
}

export const ProducerTrendsDateFilter: React.FC<ProducerTrendsDateFilterProps> = ({
  onDateRangeChange
}) => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [preset, setPreset] = useState<DatePreset>('ytd')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth)
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>()
  const [customToDate, setCustomToDate] = useState<Date | undefined>()

  useEffect(() => {
    const todayStr = today()
    
    switch (preset) {
      case 'ytd':
        onDateRangeChange('2025-04-01', todayStr)
        break
      
      case 'last30':
        onDateRangeChange(
          dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          todayStr
        )
        break
      
      case 'last60':
        onDateRangeChange(
          dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
          todayStr
        )
        break
      
      case 'last90':
        onDateRangeChange(
          dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
          todayStr
        )
        break
      
      case 'month':
        if (selectedMonth) {
          const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
          const endDate = dayjs(`${selectedYear}-${selectedMonth}-01`).endOf('month').format('YYYY-MM-DD')
          onDateRangeChange(startDate, endDate)
        }
        break
      
      case 'custom':
        if (customFromDate && customToDate) {
          onDateRangeChange(
            dayjs(customFromDate).format('YYYY-MM-DD'),
            dayjs(customToDate).format('YYYY-MM-DD')
          )
        }
        break
    }
  }, [preset, selectedYear, selectedMonth, customFromDate, customToDate, onDateRangeChange])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Date Range:</label>
        <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ytd">YTD 2025</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="last60">Last 60 Days</SelectItem>
            <SelectItem value="last90">Last 90 Days</SelectItem>
            <SelectItem value="month">Single Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {preset === 'month' && (
        <MonthYearPickers
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
      )}

      {preset === 'custom' && (
        <DateRangePicker
          fromDate={customFromDate}
          toDate={customToDate}
          onFromDateChange={setCustomFromDate}
          onToDateChange={setCustomToDate}
        />
      )}
    </div>
  )
}
