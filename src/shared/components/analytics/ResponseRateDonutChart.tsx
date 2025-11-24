import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ResponseData } from '../../types/analytics';

interface ResponseRateDonutChartProps {
  data: ResponseData[];
}

const ResponseRateDonutChart: React.FC<ResponseRateDonutChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create pie generator
    const pie = d3.pie<ResponseData>()
      .value(d => d.count)
      .sort(null);

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<ResponseData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Create tooltip div (remove existing first)
    d3.select('body').selectAll('.donut-tooltip').remove();
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'donut-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000');

    // Add arcs
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Add paths with animation and hover effects
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .transition()
      .duration(1000)
      .style('opacity', 1)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t))!;
        };
      });

    // Add hover effects and tooltips
    arcs.selectAll('path')
      .on('mouseover', function(event, d) {
        const arcData = d as d3.PieArcDatum<ResponseData>;
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.8)
          .attr('transform', 'scale(1.05)');
        
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${arcData.data.status}</strong><br/>
            Count: ${arcData.data.count}<br/>
            Percentage: ${arcData.data.percentage}%
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .attr('transform', 'scale(1)');
        
        tooltip.style('opacity', 0);
      });

    // Add percentage labels on the arcs
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .transition()
      .delay(1000)
      .duration(500)
      .style('opacity', 1)
      .text(d => `${d.data.percentage}%`);

    // Center text showing total
    const total = data.reduce((sum, d) => sum + d.count, 0);
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#111827')
      .attr('y', -5)
      .style('opacity', 0)
      .transition()
      .delay(1500)
      .duration(500)
      .style('opacity', 1)
      .text(total);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6B7280')
      .attr('y', 15)
      .style('opacity', 0)
      .transition()
      .delay(1500)
      .duration(500)
      .style('opacity', 1)
      .text('Quotes Requested');

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.donut-tooltip').remove();
    };

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Quote Response Distribution</h3>
      <div className="flex justify-center overflow-visible">
        <svg ref={svgRef} style={{ overflow: 'visible' }}></svg>
      </div>
    </div>
  );
};

export default ResponseRateDonutChart;