import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { VendorResponseAnalytics, ChartDimensions } from '../../types';
import { transformVendorResponseDataForChart } from '../../utils/analyticsCalculations';
import { BRAND_COLORS } from '../../utils/constants';

interface VendorResponseChartProps {
  data: VendorResponseAnalytics[];
  width?: number;
  height?: number;
  title?: string;
  showResponseRate?: boolean;
}

const VendorResponseChart: React.FC<VendorResponseChartProps> = ({
  data,
  width = 700,
  height = 400,
  title = 'Vendor Response Times',
  showResponseRate = false
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
    margin: { top: 20, right: 30, bottom: 80, left: 60 }
  };

  const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const chartData = transformVendorResponseDataForChart(data);
    
    if (chartData.length === 0) return;

    // Limit to top 10 vendors for readability
    const topVendors = chartData.slice(0, 10);

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(topVendors.map(d => d.label))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(topVendors, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    // Create color scale based on response rate
    const colorScale = d3
      .scaleSequential(d3.interpolateRdYlGn)
      .domain([0, 100]);

    // Create bars
    const bars = g
      .selectAll('.bar')
      .data(topVendors)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.label) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', chartHeight)
      .attr('height', 0)
      .attr('fill', d => showResponseRate 
        ? colorScale(d.metadata?.responseRate as number || 0)
        : BRAND_COLORS.primary)
      .attr('stroke', 'none')
      .style('cursor', 'pointer');

    // Animate bars
    bars
      .transition()
      .duration(750)
      .ease(d3.easeQuadOut)
      .attr('y', d => yScale(d.value))
      .attr('height', d => chartHeight - yScale(d.value));

    // Add hover effects
    bars
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke', BRAND_COLORS.dark)
          .attr('stroke-width', 2);

        const tooltipContent = `
          <strong>${d.label}</strong><br/>
          Avg Response Time: ${d.value.toFixed(1)} hours<br/>
          Response Rate: ${d.metadata?.responseRate || 0}%<br/>
          Total Requests: ${d.metadata?.totalRequests || 0}<br/>
          Responses: ${d.metadata?.responses || 0}
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
          .attr('opacity', 1)
          .attr('stroke', 'none');

        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // Add value labels
    g.selectAll('.bar-label')
      .data(topVendors)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', BRAND_COLORS.dark)
      .style('opacity', 0)
      .text(d => `${d.value.toFixed(1)}h`)
      .transition()
      .delay(750)
      .duration(300)
      .style('opacity', 1);

    // X-axis
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '11px')
      .style('fill', BRAND_COLORS.gray[700]);

    // Y-axis
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', BRAND_COLORS.gray[700]);

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - dimensions.margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', BRAND_COLORS.gray[700])
      .text('Response Time (Hours)');

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

    // Add response rate legend if showing response rate colors
    if (showResponseRate) {
      const legendHeight = 20;
      const legendWidth = 200;
      const legendX = chartWidth - legendWidth;
      const legendY = -10;

      const legendScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d => `${d}%`);

      // Create gradient for legend
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'response-rate-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      const numStops = 10;
      for (let i = 0; i <= numStops; i++) {
        gradient.append('stop')
          .attr('offset', `${(i / numStops) * 100}%`)
          .attr('stop-color', colorScale((i / numStops) * 100));
      }

      // Legend rectangle
      g.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#response-rate-gradient)');

      // Legend axis
      g.append('g')
        .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
        .call(legendAxis)
        .selectAll('text')
        .style('font-size', '10px');

      // Legend title
      g.append('text')
        .attr('x', legendX + legendWidth / 2)
        .attr('y', legendY - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .text('Response Rate');
    }

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

  }, [data, dimensions, chartWidth, chartHeight, title, showResponseRate]);

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

export default VendorResponseChart;