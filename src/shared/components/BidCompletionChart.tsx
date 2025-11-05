import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { ActiveBidStatusData, ChartDimensions } from '../types';
import { transformActiveBidsForPieChart } from '../utils/analyticsCalculations';
import { BRAND_COLORS } from '../utils/constants';

interface BidCompletionChartProps {
  data: { status: string; count: number; percentage: number }[];
  width?: number;
  height?: number;
  title?: string;
}

const BidCompletionChart: React.FC<BidCompletionChartProps> = ({
  data,
  width = 600,
  height = 400,
  title = 'Active Bids'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  const dimensions: ChartDimensions = useMemo(() => ({
    width,
    height,
    margin: { top: 40, right: 120, bottom: 40, left: 40 }
  }), [width, height]);

  const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
  const radius = Math.min(chartWidth, chartHeight) / 2;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous chart

    const chartData = transformActiveBidsForPieChart(data);
    
    if (chartData.length === 0) return;

    // Create main group and center it
    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left + chartWidth / 2},${dimensions.margin.top + chartHeight / 2})`);

    // Create pie generator
    const pie = d3.pie<ActiveBidStatusData>()
      .value(d => d.count)
      .sort(null);

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<ActiveBidStatusData>>()
      .innerRadius(0)
      .outerRadius(radius - 10);

    // Create hover arc (slightly larger)
    const hoverArc = d3.arc<d3.PieArcDatum<ActiveBidStatusData>>()
      .innerRadius(0)
      .outerRadius(radius - 5);

    // Generate pie data
    const pieData = pie(chartData);

    // Create pie slices
    const slices = g.selectAll('.slice')
      .data(pieData)
      .enter()
      .append('g')
      .attr('class', 'slice');

    // Add paths for each slice
    const paths = slices
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add slice labels (percentages)
    slices
      .append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#fff')
      .text(d => d.data.percentage > 5 ? `${d.data.percentage}%` : ''); // Only show percentage if slice is large enough

    // Add hover effects
    paths
      .on('mouseover', function(event, d) {
        // Darken the color and ensure opacity stays at 1
        const originalColor = d.data.color;
        const darkerColor = d3.color(originalColor)?.darker(0.3).toString() || originalColor;
        
        d3.select(this)
          .attr('d', hoverArc(d))
          .style('fill', darkerColor);

        const tooltipContent = `
          <strong>${d.data.status}</strong><br/>
          Count: ${d.data.count}<br/>
          Percentage: ${d.data.percentage}%
        `;

        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          content: tooltipContent
        });
      })
      .on('mousemove', function(event) {
        setTooltip(prev => ({
          ...prev,
          x: event.clientX,
          y: event.clientY
        }));
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .attr('d', arc(d))
          .style('fill', d.data.color);

        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // Add center text showing total count
    const totalBids = chartData.reduce((sum, d) => sum + d.count, 0);
    const centerGroup = g.append('g').attr('class', 'center-text');
    
    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '24px')
      .style('font-weight', '700')
      .style('fill', BRAND_COLORS.dark)
      .text(totalBids.toString());

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', BRAND_COLORS.gray[600])
      .text('Active Bids');

    // Add legend
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${dimensions.width - dimensions.margin.right + 20}, ${dimensions.margin.top})`);

    const legendItems = legend.selectAll('.legend-item')
      .data(chartData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 25})`);

    // Legend rectangles
    legendItems
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', d => d.color)
      .attr('rx', 2);

    // Legend text
    legendItems
      .append('text')
      .attr('x', 18)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', BRAND_COLORS.gray[700])
      .text(d => `${d.status} (${d.count})`);

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

  }, [data, dimensions, chartWidth, chartHeight, radius, title]);

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
          className="fixed pointer-events-none z-50 bg-gray-900 text-white text-sm rounded px-3 py-2 shadow-lg"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default BidCompletionChart;