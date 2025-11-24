import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TrendData } from '../../types/analytics';

interface ResponseRateTrendChartProps {
  data: TrendData[];
}

const ResponseRateTrendChart: React.FC<ResponseRateTrendChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const maxRequests = Math.max(...data.map(d => d.totalBids));
    const maxResponses = Math.max(...data.map(d => d.responsesReceived));
    const yMax = Math.max(maxRequests, maxResponses) * 1.1; // Add 10% padding

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height, 0]);

    // Line generators
    const requestsLine = d3.line<TrendData>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.totalBids))
      .curve(d3.curveMonotoneX);

    const responsesLine = d3.line<TrendData>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.responsesReceived))
      .curve(d3.curveMonotoneX);

    // Add grid lines
    g.selectAll('.grid-line-x')
      .data(xScale.ticks(6))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#f3f4f6')
      .attr('stroke-dasharray', '2,2');

    g.selectAll('.grid-line-y')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#f3f4f6')
      .attr('stroke-dasharray', '2,2');

    // Add requests sent line (blue)
    const requestsPath = g.append('path')
      .datum(data)
      .attr('class', 'requests-line')
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', requestsLine);

    // Add responses received line (green)
    const responsesPath = g.append('path')
      .datum(data)
      .attr('class', 'responses-line')
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3)
      .attr('d', responsesLine);

    // Animate requests line
    const requestsLength = requestsPath.node()?.getTotalLength() || 0;
    requestsPath
      .attr('stroke-dasharray', `${requestsLength} ${requestsLength}`)
      .attr('stroke-dashoffset', requestsLength)
      .transition()
      .duration(2000)
      .attr('stroke-dashoffset', 0);

    // Animate responses line
    const responsesLength = responsesPath.node()?.getTotalLength() || 0;
    responsesPath
      .attr('stroke-dasharray', `${responsesLength} ${responsesLength}`)
      .attr('stroke-dashoffset', responsesLength)
      .transition()
      .delay(500)
      .duration(2000)
      .attr('stroke-dashoffset', 0);

    // Add data points for requests
    g.selectAll('.requests-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'requests-dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.totalBids))
      .attr('r', 0)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .delay((_, i) => i * 100 + 1000)
      .duration(500)
      .attr('r', 5);

    // Add data points for responses
    g.selectAll('.responses-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'responses-dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.responsesReceived))
      .attr('r', 0)
      .attr('fill', '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .delay((_, i) => i * 100 + 1500)
      .duration(500)
      .attr('r', 5);

    // Add interactive hover
    const tooltip = d3.select('body').append('div')
      .attr('class', 'trend-tooltip')
      .style('position', 'absolute')
      .style('padding', '12px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000');

    // Hover for requests dots
    g.selectAll('.requests-dot')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseover', function(event: any, d: any) {
        d3.select(this).transition().duration(200).attr('r', 7);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <strong>${d.month}</strong><br/>
          <span style="color: #3b82f6;">● Requests Sent: ${d.totalBids}</span><br/>
          Responses Received: ${d.responsesReceived}<br/>
          Response Rate: ${d.responseRate}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(200).attr('r', 5);
        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Hover for responses dots
    g.selectAll('.responses-dot')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('mouseover', function(event: any, d: any) {
        d3.select(this).transition().duration(200).attr('r', 7);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <strong>${d.month}</strong><br/>
          Requests Sent: ${d.totalBids}<br/>
          <span style="color: #10b981;">● Responses Received: ${d.responsesReceived}</span><br/>
          Response Rate: ${d.responseRate}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(200).attr('r', 5);
        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d') as any));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text('Requests Sent');

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 20)
      .attr('y2', 20)
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 20)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text('Responses Received');

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('Count');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('Date (Last 30 Days)');

    // Cleanup tooltip on component unmount
    return () => {
      d3.selectAll('.trend-tooltip').remove();
    };

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Daily Requests & Responses (Last 30 Days)</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ResponseRateTrendChart;