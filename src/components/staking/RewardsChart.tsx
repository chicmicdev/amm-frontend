import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, type IChartApi, AreaSeries, type BusinessDay } from 'lightweight-charts';
import { useAppKitAccount } from '@reown/appkit/react';
import { getRewardsHistory, getStakingStats } from '../../services/api/stakingService';

export default function RewardsChart() {
  const { address } = useAppKitAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['rewardsHistory', address],
    queryFn: () => getRewardsHistory(address ?? ''),
  });

  const { data: stats } = useQuery({
    queryKey: ['stakingStats'],
    queryFn: getStakingStats,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!containerRef.current || !history || history.length === 0) return;

    // Cleanup previous chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: "'Inter', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(31,41,55,0.4)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(99,102,241,0.4)' },
        horzLine: { color: 'rgba(99,102,241,0.4)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(31,41,55,0.4)',
      },
      timeScale: {
        borderColor: 'rgba(31,41,55,0.4)',
        tickMarkFormatter: (time: BusinessDay | number | string) => {
          if (typeof time === 'object' && time !== null) {
            return `${time.day}/${time.month}`;
          }
          if (typeof time === 'string') {
            const parts = time.split('-');
            return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
          }
          // UTCTimestamp: use UTC methods to avoid timezone shifts
          const d = new Date(time * 1000);
          return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#6366f1',
      topColor: 'rgba(99,102,241,0.35)',
      bottomColor: 'rgba(99,102,241,0.0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    areaSeries.setData(
      history.map((p) => {
        const [year, month, day] = (p.time as string).split('-').map(Number);
        return { time: { year, month, day } as BusinessDay, value: p.value };
      })
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [history]);

  return (
    <div className="stake-card" style={{ padding: '24px 24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Rewards Over Time</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Demo trend (on-chain rewards: {stats?.rewardTokenSymbol ?? '—'}). Connect activity history indexer for live data.
          </div>
        </div>
        <span style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#818cf8',
          fontSize: 12, fontWeight: 600, padding: '4px 10px',
          borderRadius: 20, border: '1px solid rgba(99,102,241,0.25)',
        }}>
          Last 30 days
        </span>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : (
        <div ref={containerRef} style={{ width: '100%' }} />
      )}
    </div>
  );
}
