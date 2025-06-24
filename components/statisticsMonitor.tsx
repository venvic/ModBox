import React, { useEffect, useState } from 'react';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { fetchProductModulesCount, fetchProductPageViews } from '@/utils/fetchData';

const chartConfig = {
  desktop: {
    label: "Module",
    color: "#2563eb",
  },
  mobile: {
    label: "Page views",
    color: "#0F3DAF",
  }
} satisfies ChartConfig;

const Statistics = () => {
  const [productModulesCount, setProductModulesCount] = useState<{ name: string, modulesCount: number, pageViews: number }[]>([]);
  const [totalModulesCount, setTotalModulesCount] = useState(0);
  const [reads, setReads] = useState(0);

  useEffect(() => {
    const fetchModulesCount = async () => {
      const cachedData = localStorage.getItem('statistics');
      const cachedTime = localStorage.getItem('statisticsTime');
      const now = new Date().getTime();

      if (cachedData && cachedTime && now - parseInt(cachedTime) < 120000) {
        const data = JSON.parse(cachedData);
        setProductModulesCount(data.productModulesCount);
        setTotalModulesCount(data.totalModulesCount);
        setReads(data.reads);
      } else {
        const modulesCount = await fetchProductModulesCount();
        const pageViews = await fetchProductPageViews();
        const combinedData = modulesCount.map((product) => {
          const pageViewData = pageViews.find((view: any) => view.slug === product.slug);
          return {
            ...product,
            pageViews: pageViewData ? pageViewData.eventCount : 0,
          };
        });
        setProductModulesCount(combinedData);
        const totalModules = combinedData.reduce((acc, product) => acc + product.modulesCount, 0);
        setTotalModulesCount(totalModules);

        const response = await fetch('/api/getProjectInsights');
        const data = await response.json();
        if (!data.error) {
          setReads(data.reads);
        }

        const statistics = {
          productModulesCount: combinedData,
          totalModulesCount: totalModules,
          reads: data.reads,
        };
        localStorage.setItem('statistics', JSON.stringify(statistics));
        localStorage.setItem('statisticsTime', now.toString());
      }
    };
    fetchModulesCount();
  }, []);

  const chartData = productModulesCount.map(product => ({
    name: product.name,
    modulesCount: product.modulesCount,
    pageViews: product.pageViews,
  }));

  const getBarFillColor = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    switch (theme) {
      case "cosmema":
        return "#D97706"; // Amber-like color
      case "minimal":
        return "#A8A29E"; // Gray-like color
      default:
        return "#6A6D95"; // Default for "modern"
    }
  };

  return (
    <div className='flex flex-col h-fit gap-4 border rounded-lg mt-4 bg-background/60 backdrop-blur-xl'>
      <div className='h-fit flex border-b w-full px-7'>
        <div className='py-8 w-2/4'>
          <h2 className='font-semibold text-lg'>Nutzung</h2>
          <p className='text-sm text-foreground/60'>Aktive und inaktive Module sowie Lese- und Schreibvorgänge.</p>
        </div>
        <div className='py-8 pl-10 border-l border-r w-1/4 bg-muted'>
          <p className='text-xs text-foreground/60'>Module</p>
          <h3 className='text-2xl font-bold'>{totalModulesCount}</h3>
        </div>
        <div className='py-8 pl-10 w-1/4 select-none'>
          <p className='text-xs text-foreground/60'>Lesevorgänge</p>
          <h3 className='text-2xl font-bold'>{reads.toLocaleString('de-DE')}</h3>
        </div>
      </div>
      <div className='px-7 py-8'>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="modulesCount" fill={getBarFillColor()} radius={3} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default Statistics;
