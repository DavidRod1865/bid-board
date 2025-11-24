import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { VendorData } from '../../types/analytics';

interface VendorPerformanceBubbleChartProps {
  data: VendorData[];
}

const VendorPerformanceBubbleChart: React.FC<VendorPerformanceBubbleChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...data.map(d => d.avgResponseTime)) + 2])
      .range([height, 0]);

    const sizeScale = d3.scaleSqrt()
      .domain([0, Math.max(...data.map(d => d.totalBids))])
      .range([5, 30]);

    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateRdYlGn);

    // Add grid
    g.selectAll('.grid-line-x')
      .data(xScale.ticks(10))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#f3f4f6')
      .attr('stroke-dasharray', '2,2');

    g.selectAll('.grid-line-y')
      .data(yScale.ticks(8))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#f3f4f6')
      .attr('stroke-dasharray', '2,2');

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'bubble-tooltip')
      .style('position', 'absolute')
      .style('padding', '12px')
      .style('background', 'white')
      .style('border', '1px solid #d1d5db')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000');

    // Add bubbles
    const bubbles = g.selectAll('.bubble')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('cx', d => xScale(d.responseRate))
      .attr('cy', d => yScale(d.avgResponseTime))
      .attr('r', 0)
      .attr('fill', d => colorScale(d.reliabilityScore))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer');

    // Animate bubbles
    bubbles
      .transition()
      .delay((_, i) => i * 50)
      .duration(1000)
      .attr('r', d => sizeScale(d.totalBids));

    // Add hover interactions
    bubbles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseover', function(event: any, d: VendorData) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', sizeScale(d.totalBids) + 5)
          .attr('opacity', 1);

        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div style="font-weight: 600; margin-bottom: 8px;">${d.name}</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div>Response Rate: <span style="font-weight: 500;">${d.responseRate}%</span></div>
            <div>Avg Response Time: <span style="font-weight: 500;">${d.avgResponseTime} days</span></div>
            <div>Total Bids: <span style="font-weight: 500;">${d.totalBids}</span></div>
            <div>Reliability Score: <span style="font-weight: 500;">${d.reliabilityScore}</span></div>
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseout', function(_: any, d: VendorData) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', sizeScale(d.totalBids))
          .attr('opacity', 0.8);

        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`));

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d} days`));

    // Axis labels
    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#374151')
      .text('Response Rate (%)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 20)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#374151')
      .text('Average Response Time (days)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, 50)`);

    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .text('Bubble Size = Total Bids');

    legend.append('text')
      .attr('x', 0)
      .attr('y', 20)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .text('Color = Reliability Score');

    // Color legend
    const colorLegend = legend.append('g')
      .attr('transform', 'translate(0, 35)');

    const gradientId = 'color-gradient';
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.selectAll('stop')
      .data([
        { offset: '0%', color: colorScale(0) },
        { offset: '50%', color: colorScale(50) },
        { offset: '100%', color: colorScale(100) }
      ])
      .enter()
      .append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    colorLegend.append('rect')
      .attr('width', 100)
      .attr('height', 10)
      .style('fill', `url(#${gradientId})`);

    colorLegend.append('text')
      .attr('x', 0)
      .attr('y', 25)
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text('0');

    colorLegend.append('text')
      .attr('x', 100)
      .attr('y', 25)
      .style('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text('100');

    return () => {
      d3.selectAll('.bubble-tooltip').remove();
    };

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Vendor Performance Analysis</h3>
      <p className="text-sm text-gray-600 mb-4">
        X-axis: Response Rate | Y-axis: Response Time | Bubble Size: Total Bids | Color: Reliability Score
      </p>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default VendorPerformanceBubbleChart;