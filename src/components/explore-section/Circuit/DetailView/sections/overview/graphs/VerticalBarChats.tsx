'use client'


import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export type BarChartProps = {
    title: string;
    index: number;
    data: { label: string; value: number }[];
    width?: number;
    height?: number;
}

export default function VerticalBarChart({ title, index, data, width = 400, height = 400 }: BarChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
  
    useEffect(() => {
      if (!svgRef.current || data.length === 0) return;
  
      // Clear existing content
      d3.select(svgRef.current).selectAll("*").remove();
  
      // Set up dimensions and margins
      const margin = { top: 20, right: 30, bottom: 50, left: 50 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
  
      // Create SVG
      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // X scale (categorical)
      const xScale = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerWidth])
        .padding(0.2); // Space between bars
  
      // Y scale (linear)
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) || 0])
        .nice() // Rounds the domain for better axis ticks
        .range([innerHeight, 0]);
  
      // Draw bars
      svg
        .selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.label) || 0)
        .attr("y", (d) => yScale(d.value))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d.value))
        .attr("fill", "#4ecdc4"); // Teal color (customize as needed)
  
      // Add X axis
      svg
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)") // Rotate labels for readability
        .style("text-anchor", "end");
  
      // Add Y axis
      svg.append("g").call(d3.axisLeft(yScale));
  
      // Add labels (optional)
      svg
        .selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
        .attr("y", (d) => yScale(d.value) - 5) // Slightly above the bar
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text((d) => d.value);
  
    }, [data, width, height]); // Re-render if data, width, or height changes
  
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
    );
  }