'use client'

import * as d3 from 'd3';

import { useEffect, useRef } from 'react';
import { SingleGraphDataProps } from '../../OverviewSection';

export type PieDataProps = {
    label: string;
    value: number;
  }

export default function PieCharts({
    data,
    title,
    index,
}:{
    data: SingleGraphDataProps[];
    title: string;
    index: number;
}) {

    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;
    
        // SVG dimensions
        const width = 300;
        const legendItemHeight = 25;
        const pieLegendGap = 40
        const height = 300 + data.length * legendItemHeight + pieLegendGap;
        const radius = Math.min(width, height - (data.length * legendItemHeight + pieLegendGap)) / 2;
    
        // Clear any existing content
        d3.select(svgRef.current).selectAll("*").remove();
    
        
        const svg = d3
          .select(svgRef.current)
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${width / 2}, ${radius})`); // Center pie vertically
    
        // Create pie generator
        const pie = d3
          .pie<PieDataProps>()
          .value((d) => d.value);
    
        // Create arc generator for the pie slices
        const arc = d3
          .arc<d3.PieArcDatum<PieDataProps>>()
          .innerRadius(0)
          .outerRadius(radius);
    
        // Generate pie data
        const arcs = svg.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc");
    
        // Define colors for slices
        const color = d3.scaleOrdinal<string>()
          .domain(data.map((d) => d.label))
          .range(d3.schemeCategory10); // Use D3's categorical color scheme
    
        // Draw pie slices
        arcs
          .append("path")
          .attr("d", arc)
          .attr("fill", (d) => color(d.data.label))
          .attr("stroke", "white")
          .attr("stroke-width", 2);
    
        // Add legend vertically below the pie
        const legend = d3
          .select(svgRef.current)
          .append("g")
          .attr("transform", `translate(${width / 2 - 100}, ${radius * 2 + pieLegendGap})`); // Position below pie
    
        const legendItems = legend
          .selectAll(".legend-item")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => `translate(0, ${i * legendItemHeight})`); // Stack vertically
    
        // Add colored circles
        legendItems
          .append("circle")
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("r", 6)
          .attr("fill", (d) => color(d.label));
    
        // Add labels next to circles
        legendItems
          .append("text")
          .attr("x", 12)
          .attr("y", 4)
          .attr("fill", "#003A8C")
          .attr("font-size", "14px")
          .text((d) => `${d.label} (${d.value}%)`);
    
      }, [data])
    

    return (
        <div className="relative flex flex-col self-start justify-self-start">
            <div className="relative flex flex-col text-primary-9 mb-4">
                <div className="text-base font-normal">
                    Fig. { index + 1 }
                </div>
                <h3 className="text-xl font-bold">
                    { title }
                </h3>
            </div>

            <svg ref={svgRef}></svg>
        </div>
    )
}