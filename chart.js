// https://observablehq.com/@d3/hierarchical-edge-bundling
// https://observablehq.com/@d3/radial-dendrogram
// https://observablehq.com/@d3/visiting-a-d3-hierarchy
// https://observablehq.com/@d3/d3-hierarchy
const colourCircle = "#999",
      colourLink = "#999",
      colourLinkOver = "red";

let pairs = (arr) => arr.flatMap( (v, i) => arr.slice(i + 1).map(w => [v, w]) );
function preprocessLinks(data) {
  return data.map(d => pairs(d["keywords"]));
}

let line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(d => d.y)
    .angle(d => d.x);

d3.csv("categoriesFullPaper.csv").then(function(categories){
  d3.json("keywordsFullPaper.json").then(function(keywords) {
    // Web chart
    const width = 100,
          height = 100,
          radius = width / 3;

    let svgWebChart = d3.select(".web-chart")
      .append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    let group = d3.group(categories, d => d.Category);
    let hierarchy = d3.hierarchy(group)
      .sort((a, b) => d3.descending(a.Category, b.Category) || d3.descending(a.Keywords - b.Keyword))
    let root = d3.cluster().size([2*Math.PI, radius])(hierarchy);

    // svgWebChart.append("g")
    // .selectAll("circle")
    // .data(root.leaves())
    // .join("circle")
    //   .attr("transform", d => `
    //     rotate(${d.x * 180 / Math.PI - 90})
    //     translate(${d.y},0)
    //   `)
    //   .attr("fill", colourCircle)
    //   .attr("r", 0.5);

    svgWebChart.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 1.5)
      .selectAll("text")
      .data(root.leaves())
      .join("text")
        .attr("transform", d => `
          rotate(${d.x * 180 / Math.PI - 90})
          translate(${d.y},0)
          rotate(${d.x >= Math.PI ? 180 : 0})
        `)
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI ? 1.5 : -1.5)
        .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
        .text(d => d.data.Keyword)
        .each(function(d) { d.text = this; })
        .on("mouseover", keywordOvered)
        .on("mouseout", keywordOuted)
    
    let map = new Map(root.leaves().map(d => [d.data.Keyword, d]));
    let pairset = keywords
      .flatMap(d => pairs([...new Set(d.keywords)].sort()));    
    let pairCounts = pairset
      .map(d => d.toString())
      .reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map());
    let filteredPairset = [...new Map(pairset.map(item => [item.toString(), item])).values()]
      .filter(d => pairCounts.get(d.toString()) > 20);
    let linkData = filteredPairset.map(([x,y]) => [map.get(x), map.get(y)]);

    let counts = filteredPairset.map(p => pairCounts.get(p.toString()));
    let widthScale = d3.scaleLinear()
      .domain([d3.min(counts), d3.max(counts)])
      .range([0.1, 1]);
    
    const link = svgWebChart.append("g")
        .attr("stroke", colourLink)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("fill", "none")
      .selectAll("path")
      .data(linkData)
      .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("stroke-width", ([a,b]) => {
          let width = widthScale(pairCounts.get([a.data.Keyword, b.data.Keyword].toString()));
          return width;
        })
        .attr("d", ([a, b]) => line(a.path(b)))
        .each(function(d) { d.path = this; });

    function keywordOvered(event, d) {
      link.style("mix-blend-mode", null);
      let keywordLinks = linkData.filter(([a,b]) => [a.data.Keyword, b.data.Keyword].includes(d.data.Keyword));
      d3.selectAll(keywordLinks.map(d => d.path))
        .attr("stroke", colourLinkOver).raise();
      let linkedKeywords = keywordLinks.flatMap(([a,b]) => [a.data.Keyword, b.data.Keyword]);
      d3.selectAll(root.leaves().filter(d => linkedKeywords.includes(d.data.Keyword)).map(d => d.text))
        .attr("font-weight", "bold")
        .attr("fill", colourLinkOver);
    }

    function keywordOuted(event, d) {
      link.style("mix-blend-mode", "multiply");
      let keywordLinks = linkData.filter(([a,b]) => [a.data.Keyword, b.data.Keyword].includes(d.data.Keyword));
      d3.selectAll(keywordLinks.map(d => d.path))
        .attr("stroke", colourLink).raise();
      let linkedKeywords = keywordLinks.flatMap(([a,b]) => [a.data.Keyword, b.data.Keyword]);
      d3.selectAll(root.leaves().filter(d => linkedKeywords.includes(d.data.Keyword)).map(d => d.text))
        .attr("font-weight", null)
        .attr("fill", null);
    }

    // Bar chart
    const widthBarChart = 400,
          heightBarChart = 100,
          marginBarChart = {top: 10, right: 10, bottom: 30, left: 10};

    let pairCountsReduced = Array.from(pairCounts.values())
      .sort((a,b) => a - b)
      .reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map());
    
    let xScaleBarChart = d3.scaleBand()
      .domain(pairCountsReduced.keys())
      .range([0, widthBarChart - marginBarChart.left - marginBarChart.right])
      .padding(0.4);

    let yScaleBarChart = d3.scaleLinear()
      .domain([0, d3.max(pairCountsReduced.values()) - marginBarChart.top - marginBarChart.bottom])
      .range([0, heightBarChart]);
    
    let svgBarChart = d3.select(".bar-chart")
      .append("svg")
        .attr("height", heightBarChart)
        .attr("width", widthBarChart)
      .append("g")
        .attr("transform", `translate(${marginBarChart.left}, ${marginBarChart.top})`);
    
    svgBarChart.append("g")
      .selectAll("rect")
      .data(pairCountsReduced)
      .join("rect")
      .attr("x", d => xScaleBarChart(d[0]))
      .attr("y", d => heightBarChart - yScaleBarChart(d[1]) - marginBarChart.bottom)
      .attr("height", d => yScaleBarChart(d[1]))
      .attr("width", xScaleBarChart.bandwidth());
    
    svgBarChart.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 8)
      .selectAll("text")
      .data(pairCountsReduced)
      .join("text")
      .text(d => d[1])
      .attr("x", d => xScaleBarChart(d[0]))
      .attr("y", d => heightBarChart - yScaleBarChart(d[1]) - marginBarChart.bottom - 4);
    
    svgBarChart.append("g")
      .attr("transform", `translate(0, ${heightBarChart - marginBarChart.bottom})`)
      .call(d3.axisBottom(xScaleBarChart));
  })
})
