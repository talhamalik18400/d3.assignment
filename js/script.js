const margin = { top: 40, right: 40, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// SVG container
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

// Load CSV and draw chart
d3.csv("data/steam_reviews.csv").then(rawData => {
  
  // Convert timestamp
  rawData.forEach(d => {
    d.date = new Date(+d.timestamp_created * 1000);
  });

  // Group by date (daily aggregation)
  const grouped = d3.rollup(
    rawData,
    v => v.length,
    d => d3.timeDay(d.date)  // group by day
  );

  // Convert to array and sort by date
  const data = Array.from(grouped, ([date, count]) => ({ date, count }));
  data.sort((a, b) => a.date - b.date);

  // Calculate date range for tick spacing
  const dateRange = d3.extent(data, d => d.date);
  const daySpan = Math.floor((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24));
  
  // Determine tick interval based on data span
  let tickInterval;
  if (daySpan <= 30) {
    tickInterval = d3.timeDay.every(3); // Show every 3 days for short ranges
  } else if (daySpan <= 90) {
    tickInterval = d3.timeDay.every(7); // Show weekly for medium ranges
  } else {
    tickInterval = d3.timeMonth.every(1); // Show monthly for long ranges
  }

  // Scales
  const xScale = d3.scaleTime()
    .domain(dateRange)
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([height, 0])
    .nice();

  // Area generator with smooth curve
  const area = d3.area()
    .x(d => xScale(d.date))
    .y0(height)
    .y1(d => yScale(d.count))
    .curve(d3.curveMonotoneX);

  // Add gradient for area fill
  const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgba(66, 135, 245, 0.8)");

  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(66, 135, 245, 0.1)");

  // Add area path
  svg.append("path")
    .datum(data)
    .attr("fill", "url(#area-gradient)")
    .attr("stroke", "#4287f5")
    .attr("stroke-width", 2)
    .attr("d", area)
    .attr("opacity", 0)
    .transition()
    .duration(1000)
    .attr("opacity", 1);

  // Add data points for interaction
  svg.selectAll(".data-point")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "data-point")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.count))
    .attr("r", 3)
    .attr("fill", "#4287f5")
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.95);
      
      // Format date nicely
      const dateStr = d3.timeFormat("%B %d, %Y")(d.date);
      tooltip.html(`
        <h3>${dateStr}</h3>
        <p><strong>Reviews:</strong> ${d3.format(",")(d.count)}</p>
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      
      // Highlight point
      d3.select(this)
        .attr("r", 5)
        .attr("fill", "#2c6bd9");
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0);
      
      d3.select(this)
        .attr("r", 3)
        .attr("fill", "#4287f5");
    });

  // X-axis with dynamic tick formatting
  const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale)
      .ticks(tickInterval)
      .tickFormat(d3.timeFormat("%b %d, %Y"))
    );

  // Rotate x-axis labels for better readability
  xAxis.selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("font-size", "11px");

  // X-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .style("font-weight", "500")
    .style("font-size", "14px")
    .text("Date");

  // Y-axis with formatted numbers
  svg.append("g")
    .call(d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => d3.format(",")(d))
    );

  // Y-axis label
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .style("font-weight", "500")
    .style("font-size", "14px")
    .text("Number of Reviews");

  // Chart title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "600")
    .style("fill", "#2c3e50")
    .text("Daily Steam Reviews Over Time");

  // Add gridlines for better readability
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .ticks(8)
      .tickSize(-width)
      .tickFormat("")
    )
    .style("stroke", "rgba(0,0,0,0.05)")
    .style("stroke-dasharray", "3,3");

  // Add total reviews annotation
  const totalReviews = d3.sum(data, d => d.count);
  svg.append("text")
    .attr("x", width - 10)
    .attr("y", 20)
    .attr("text-anchor", "end")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .style("font-weight", "500")
    .text(`Total: ${d3.format(",")(totalReviews)} reviews`);

  // Add average reviews annotation
  const avgReviews = Math.round(totalReviews / data.length);
  svg.append("text")
    .attr("x", width - 10)
    .attr("y", 40)
    .attr("text-anchor", "end")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .style("font-weight", "500")
    .text(`Daily Avg: ${d3.format(",")(avgReviews)} reviews`);

  // Add date range info
  const dateFormat = d3.timeFormat("%b %d, %Y");
  svg.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .style("font-size", "12px")
    .style("fill", "#7f8c8d")
    .text(`Date Range: ${dateFormat(dateRange[0])} - ${dateFormat(dateRange[1])}`);

});