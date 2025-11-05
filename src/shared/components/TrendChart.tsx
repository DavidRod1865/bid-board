import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TimeSeriesDataPoint, ChartDimensions } from '../types';
import { BRAND_COLORS } from '../utils/constants';

interface TrendChartProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  yAxisLabel?: string;
  showForecast?: boolean;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  width = 700,
  height = 300,
  title = 'Trend Analysis',
  yAxisLabel = 'Value',
  showForecast = false
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
    margin: { top: 20, right: 30, bottom: 50, left: 60 }
  };

  const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Separate actual data from forecast
    const actualData = data.filter(d => !d.metadata?.isForecast);
    const forecastData = data.filter(d => d.metadata?.isForecast);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    // Line generator
    const line = d3
      .line<TimeSeriesDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Create clip path for line animation
    const clipPath = svg.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', 0)
      .attr('height', chartHeight);

    // Animate clip path
    clipPath
      .transition()
      .duration(2000)
      .attr('width', chartWidth);

    // Add actual data line
    if (actualData.length > 0) {
      g.append('path')
        .datum(actualData)
        .attr('class', 'actual-line')
        .attr('fill', 'none')
        .attr('stroke', BRAND_COLORS.primary)
        .attr('stroke-width', 3)
        .attr('clip-path', 'url(#clip)')
        .attr('d', line);

      // Add dots for actual data points
      g.selectAll('.actual-dot')
        .data(actualData)
        .enter()
        .append('circle')
        .attr('class', 'actual-dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 0)
        .attr('fill', BRAND_COLORS.primary)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .transition()
        .delay((_, i) => i * 100)
        .duration(300)
        .attr('r', 4)
        .selection()
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6);

          const tooltipContent = `
            <strong>${d3.timeFormat('%b %d, %Y')(d.date)}</strong><br/>
            Value: ${d.value.toFixed(1)}<br/>
            ${d.metadata?.count ? `Count: ${d.metadata.count}` : ''}
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
            .attr('r', 4);

          setTooltip(prev => ({ ...prev, visible: false }));
        });
    }

    // Add forecast line if enabled and data exists
    if (showForecast && forecastData.length > 0) {
      // Connect last actual point with first forecast point
      const connectionData = actualData.length > 0 
        ? [actualData[actualData.length - 1], ...forecastData]
        : forecastData;

      g.append('path')
        .datum(connectionData)
        .attr('class', 'forecast-line')
        .attr('fill', 'none')
        .attr('stroke', BRAND_COLORS.gray[400])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('clip-path', 'url(#clip)')
        .attr('d', line);

      // Add forecast dots
      g.selectAll('.forecast-dot')
        .data(forecastData)
        .enter()
        .append('circle')
        .attr('class', 'forecast-dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 0)
        .attr('fill', BRAND_COLORS.gray[400])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .transition()
        .delay((_, i) => (actualData.length + i) * 100)
        .duration(300)
        .attr('r', 3)
        .selection()
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 5);

          const confidence = d.metadata?.confidence ? `${Math.round((d.metadata.confidence as number) * 100)}%` : 'N/A';
          
          const tooltipContent = `
            <strong>Forecast: ${d3.timeFormat('%b %d, %Y')(d.date)}</strong><br/>
            Predicted Value: ${d.value.toFixed(1)}<br/>
            Confidence: ${confidence}
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
            .attr('r', 3);

          setTooltip(prev => ({ ...prev, visible: false }));
        });
    }

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%b %Y') as (d: Date | d3.NumberValue) => string);
    
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
      .text(yAxisLabel);

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

    // Add legend if showing forecast
    if (showForecast && forecastData.length > 0) {
      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${chartWidth - 150}, 20)`);

      // Actual data legend
      legend.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 20)
        .attr('y2', 0)
        .attr('stroke', BRAND_COLORS.primary)
        .attr('stroke-width', 3);

      legend.append('text')
        .attr('x', 25)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', BRAND_COLORS.gray[700])
        .text('Actual');

      // Forecast legend
      legend.append('line')
        .attr('x1', 0)
        .attr('y1', 15)
        .attr('x2', 20)
        .attr('y2', 15)
        .attr('stroke', BRAND_COLORS.gray[400])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      legend.append('text')
        .attr('x', 25)
        .attr('y', 15)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', BRAND_COLORS.gray[700])
        .text('Forecast');
    }

  }, [data, dimensions, chartWidth, chartHeight, title, yAxisLabel, showForecast]);

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

export default TrendChart;