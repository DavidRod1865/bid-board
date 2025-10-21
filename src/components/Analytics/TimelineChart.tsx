import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { BidTimelineData, ChartDimensions } from '../../types';
import { BRAND_COLORS, STATUS_COLORS } from '../../utils/constants';

interface TimelineChartProps {
  data: BidTimelineData[];
  width?: number;
  height?: number;
  title?: string;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  width = 800,
  height = 400,
  title = 'Bid Process Timeline'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  const dimensions: ChartDimensions = {
    width,
    height,
    margin: { top: 40, right: 30, bottom: 60, left: 100 }
  };

  const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Transform data for Gantt chart
    const timelineData = data.map(d => ({
      ...d,
      startDate: new Date(d.start_date),
      endDate: new Date(d.end_date)
    }));

    // Group by bid_id for separate rows
    const bidGroups = d3.group(timelineData, d => d.bid_id);
    const bidIds = Array.from(bidGroups.keys()).slice(0, 10); // Limit to 10 bids for visibility

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(timelineData, d => d.startDate) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleBand()
      .domain(bidIds.map(id => `Bid ${id}`))
      .range([0, chartHeight])
      .padding(0.1);

    // Color scale for status
    const getStatusColor = (status: string) => {
      return STATUS_COLORS[status.toLowerCase() as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
    };

    // Create timeline bars for each bid
    bidIds.forEach(bidId => {
      const bidData = bidGroups.get(bidId) || [];
      const rowY = yScale(`Bid ${bidId}`) || 0;
      const rowHeight = yScale.bandwidth();

      // Create bars for each status phase
      bidData.forEach((phase, index) => {
        const barWidth = xScale(phase.endDate) - xScale(phase.startDate);
        
        g.append('rect')
          .attr('class', 'timeline-bar')
          .attr('x', xScale(phase.startDate))
          .attr('y', rowY)
          .attr('width', 0)
          .attr('height', rowHeight)
          .attr('fill', getStatusColor(phase.status_name))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .transition()
          .delay(index * 100)
          .duration(500)
          .attr('width', Math.max(barWidth, 2)) // Minimum width for visibility
          .selection()
          .on('mouseover', function(event) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 0.8);

            const tooltipContent = `
              <strong>Bid ${phase.bid_id}</strong><br/>
              Status: ${phase.status_name}<br/>
              Duration: ${phase.duration_hours.toFixed(1)} hours<br/>
              Start: ${d3.timeFormat('%b %d, %Y')(phase.startDate)}<br/>
              End: ${d3.timeFormat('%b %d, %Y')(phase.endDate)}
            `;

            setTooltip({
              visible: true,
              x: event.pageX,
              y: event.pageY,
              content: tooltipContent
            });
          })
          .on('mousemove', function(event) {
            setTooltip(prev => ({
              ...prev,
              x: event.pageX,
              y: event.pageY
            }));
          })
          .on('mouseout', function() {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', 1);

            setTooltip(prev => ({ ...prev, visible: false }));
          });

        // Add status labels for longer phases
        if (barWidth > 60) {
          g.append('text')
            .attr('x', xScale(phase.startDate) + barWidth / 2)
            .attr('y', rowY + rowHeight / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .text(phase.status_name)
            .style('opacity', 0)
            .transition()
            .delay(index * 100 + 500)
            .duration(300)
            .style('opacity', 1);
        }
      });
    });

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%b %d') as (d: Date | d3.NumberValue) => string);
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', BRAND_COLORS.gray[700]);

    // Y-axis
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', BRAND_COLORS.gray[700]);

    // Chart title
    if (title) {
      svg
        .append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', BRAND_COLORS.dark)
        .text(title);
    }

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    // Create legend
    const statusTypes = Array.from(new Set(timelineData.map(d => d.status_name)));
    const legendItemHeight = 20;
    const legendY = chartHeight + 40;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0, ${legendY})`);

    statusTypes.forEach((status, index) => {
      const legendX = (index % 4) * 150;
      const legendRowY = Math.floor(index / 4) * legendItemHeight;

      legend.append('rect')
        .attr('x', legendX)
        .attr('y', legendRowY)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', getStatusColor(status));

      legend.append('text')
        .attr('x', legendX + 16)
        .attr('y', legendRowY + 6)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', BRAND_COLORS.gray[700])
        .text(status);
    });

  }, [data, dimensions, chartWidth, chartHeight, title]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-white rounded-lg shadow-sm"
      />
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900 text-white text-sm rounded px-2 py-1 shadow-lg"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default TimelineChart;