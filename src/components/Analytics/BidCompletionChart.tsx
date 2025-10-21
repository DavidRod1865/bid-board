import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { BidCompletionAnalytics, ChartDimensions } from '../../types';
import { transformCompletionDataForBarChart } from '../../utils/analyticsCalculations';
import { BRAND_COLORS } from '../../utils/constants';

interface BidCompletionChartProps {
  data: BidCompletionAnalytics[];
  width?: number;
  height?: number;
  title?: string;
}

const BidCompletionChart: React.FC<BidCompletionChartProps> = ({
  data,
  width = 600,
  height = 400,
  title = 'Average Bid Completion Time by Status'
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
    margin: { top: 20, right: 30, bottom: 60, left: 60 }
  };

  const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous chart

    const chartData = transformCompletionDataForBarChart(data);
    
    if (chartData.length === 0) return;

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(chartData.map(d => d.label))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);


    // Create bars
    const bars = g
      .selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.label) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', chartHeight)
      .attr('height', 0)
      .attr('fill', d => d.color || BRAND_COLORS.primary)
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
          Average Time: ${d.value.toFixed(1)} hours<br/>
          Projects: ${d.metadata?.count || 0}
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

    // Add value labels on bars
    g.selectAll('.bar-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
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
      .text('Average Hours');

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

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

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

export default BidCompletionChart;