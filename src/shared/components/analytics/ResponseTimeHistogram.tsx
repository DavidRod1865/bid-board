import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TimeDistributionData } from '../../types/analytics';

interface ResponseTimeHistogramProps {
  data: TimeDistributionData[];
}

// Histogram component for vendor response times per request
const ResponseTimeHistogram: React.FC<ResponseTimeHistogramProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.range))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...data.map(d => d.count))])
      .range([height, 0]);

    // Color scale for bars
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.range))
      .range(['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']);

    // Add bars
    const bars = g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.range)!)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => colorScale(d.range) as string)
      .attr('rx', 4)
      .style('cursor', 'pointer');

    // Animate bars
    bars
      .transition()
      .duration(1000)
      .delay((_, i) => i * 100)
      .attr('y', d => yScale(d.count))
      .attr('height', d => height - yScale(d.count));

    // Add value labels on bars
    g.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => xScale(d.range)! + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .style('opacity', 0)
      .transition()
      .delay(1200)
      .duration(500)
      .style('opacity', 1)
      .text(d => d.count);

    // Add percentage labels inside bars
    g.selectAll('.percentage-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'percentage-label')
      .attr('x', d => xScale(d.range)! + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) + (height - yScale(d.count)) / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('opacity', 0)
      .transition()
      .delay(1400)
      .duration(500)
      .style('opacity', 1)
      .text(d => `${d.percentage}%`);

    // Create tooltip
    d3.select('body').selectAll('.histogram-tooltip').remove();
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'histogram-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000');

    // Add hover effects with darkening
    bars
      .on('mouseover', function(event, d) {
        const currentColor = d3.select(this).attr('fill');
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', d3.color(currentColor)!.darker(0.3).toString());
        
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${d.range}</strong><br/>
            Responses: ${d.count}<br/>
            Percentage: ${d.percentage}%
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', colorScale(d.range) as string);
        
        tooltip.style('opacity', 0);
      });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '11px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('Number of Responses');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text('Response Time Range');

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.histogram-tooltip').remove();
    };

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Vendor Response Time (Per Request)</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ResponseTimeHistogram;