// Set the dimensions of the canvas
var margin = {top: 20, right: 20, bottom: 20, left: 70},
    width = 1400 - margin.left - margin.right;

var rect_height = margin.left
var rect_margin = 10

var viz_heights = {kaggle: 250, course:margin.left*6};
var dash_height = viz_heights.kaggle + viz_heights.course + margin.top*4;



// Set canvas x-domain of start date to end date, kaggle graph scale 0-1 (kaggle rank)
var x = d3.time.scale().range([0, width])
        .domain([new Date(2015, 11, 15),new Date(2017, 07, 01)]);
var y = d3.scale.linear().range([viz_heights.kaggle, 0])
        .domain([0,1]);

// Adds the base kaggle and course svgs to canvas
var dashboard_svg = d3.select(".home-feature-image")
    .append("div")
    .classed("svg-container", true)
    .append("svg")
    .attr("id","dashboard")
    .attr("viewBox","0 0 1400 " + dash_height)
    .attr("perserveAspectRatio","xMinYMid")
    .classed("svg-content-responsive", true); 

var kaggle_svg = dashboard_svg.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", viz_heights.kaggle + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", 
                            "translate(" + margin.left + "," + margin.top + ")")

var course_svg = dashboard_svg.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", viz_heights.course + viz_heights.kaggle + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", 
                            "translate(0," + (viz_heights.kaggle + margin.top + margin.bottom) + ")")

//build kaggle graph legend frame
var legend_margin = {top:15,left:10,right:5},
    legend_x = width - 120,
    legend_y = viz_heights.kaggle - 75;

    kaggle_svg.append("rect")
        .attr("height",4*17)
        .attr("width",130)
        .attr("stroke","black")
        .attr("fill","none")
        .attr("x",legend_x)
        .attr("y",legend_y)

    kaggle_svg.append("circle")
        .attr("r", 3.5)
        .attr("cx",legend_x + legend_margin.left)
        .attr("cy",legend_y + legend_margin.top*4)
        .attr("fill","red")

    kaggle_svg.append("text")
            .attr("x",legend_x + legend_margin.left + legend_margin.right)
            .attr("y",legend_y + legend_margin.top*4)
            .text("Blog Post")

var kaggle_color = d3.scale.ordinal()
    .domain(["Kaggle Rank","Public Leaderboard", "Private Leaderboard"])
    .range(colorbrewer.Pastel2[3]);

// Parse the date / time
var parseDate = d3.time.format("%d-%b-%y").parse

//build required kaggle line elements from data and line title
function kaggle_line(data, line_title, line_index){
    var line_data = data.filter(function(d) { return d[line_title]!= ""; });
    var line= d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d[line_title]);});

    kaggle_svg.append("path")
        .attr("stroke",kaggle_color(line_title))
        .attr("stroke-width",2)
        .attr("d", line(line_data));

    kaggle_svg.selectAll("dot")
        .data(line_data)
        .enter()
        .append("a")
            .attr("xlink:href", function(d) {
                if (d.BlogLink != ""){
                    return d.BlogLink
                } else {
                    return d.CompLink
                }})
        .append("circle")
        .attr("r", 3.5)
        .attr("fill",function(d){
            if (d.BlogLink === ""){
                return kaggle_color(line_title)
            } else {
                return "red"
            }  
        })
        .attr("cx", function(d) { return x(d.date); })
        .attr("cy", function(d) { return y(d[line_title]); });

    kaggle_svg.append("circle")
        .attr("r", 3.5)
        .attr("cx",legend_x + legend_margin.left)
        .attr("cy",legend_y + legend_margin.top*line_index)
        .attr("fill",kaggle_color(line_title))

    kaggle_svg.append("text")
            .attr("x",legend_x + legend_margin.left + legend_margin.right)
            .attr("y",legend_y + legend_margin.top*line_index)
            .text(line_title)

}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}


function draw_linechart(data){
    data.forEach(function(d) {
        d.date = parseDate(d.date);
    });

    // Define the axes
    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom").ticks(18);
    var yAxis = d3.svg.axis().scale(y)
        .orient("left").ticks(6);

    kaggle_svg.append("text")
        .attr("x",-viz_heights.kaggle/2)
        .attr("y",-70/2)
        .attr("transform","rotate(-90)")
        .text("Kaggle Rank");

    //abstracted kaggle lines into kaggle_line function. Index is for legend Y-axis offsets
    kaggle_line(data,"Kaggle Rank",1)
    kaggle_line(data,"Public Leaderboard",2)
    kaggle_line(data,"Private Leaderboard",3)

    kaggle_svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + viz_heights.kaggle+ ")")
        .call(xAxis);

    // Add the Y Axis
    kaggle_svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
}

//function for drawing course chart
function draw_courses(course_data){
    var categories = d3.nest()
      .key(function(d) { return d.Category; })
      .entries(course_data);

    //pastel and equivilent dark shade colors. Dark shade covers pastel as course progresses
    var course_color = d3.scale.ordinal()
        .domain(course_data.map( function (d) {return d.Category; }))
        .range(colorbrewer.Pastel2[categories.length]);
    var comp_course_color = d3.scale.ordinal()
        .domain(course_data.map( function (d) {return d.Category; }))
        .range(colorbrewer.Set2[categories.length]);

    var category_labels = course_svg.selectAll("cat-label")
        .data(categories)
        .enter().append("g")
        .attr("transform","rotate(-90)")

    category_labels.append("text")
        .attr("class","cat-label")
        .attr("dy",".35em")
        .attr("transform", function(d,i) {return "translate(" + ((-i-1)*(rect_height)+rect_margin) + ",10)"; })
        .text(function(d){return d.key})
        .call(wrap,rect_height);

    var course = course_svg.selectAll(".course")
        .data(course_data)
        .enter().append("g")
        .attr("class", "course")
        .attr("transform", function(d) {return "translate(" + (x(parseDate(d.StartDate))+margin.left) + "," + (d.CategoryIndex*rect_height) + ")"; });

    course.append("rect")
        .attr("width",function(d){return (x(parseDate(d.EndDate))-x(parseDate(d.StartDate)))})
        .attr("height",rect_height-rect_margin)
        .attr("class","course_rect")
        .style("fill", function(d) {return course_color(d.Category)})

    var comp_course = course_svg.selectAll(".comp_course")
        .data(course_data)
        .enter().append("g")
        .attr("class", "course")
        .attr("transform", function(d) {return "translate(" + (x(parseDate(d.StartDate))+margin.left) + "," + (d.CategoryIndex*rect_height) + ")"; });

    comp_course.append("rect")
        .attr("width",function(d){return (x(parseDate(d.EndDate))-x(parseDate(d.StartDate)))*d.Progress})
        .attr("height",rect_height-rect_margin)
        .attr("class","comp_course_rect")
        .style("fill", function(d) {return comp_course_color(d.Category)})

    var wrap_width = 120//handbombing wrap width not ideal...
    comp_course.append("text")
        .attr("y",rect_margin)
        .append("a")
            .attr("dy",".15em")
            .attr("xlink:href", function(d){return d.CourseLink})
        .text(function(d){return d.CourseName})
        .call(wrap,wrap_width);
    draw_today()
}

//red dotted line down todays date scaled to the appropriate coordinates along the base svg x-plane
function draw_today(){
    var scaled_today = x(new Date())

    kaggle_svg.append("line")
    .attr("x1",scaled_today)
    .attr("x2",scaled_today)
    .attr("y1",0)
    .attr("y2",viz_heights.kaggle)
    .attr("stroke-width",2)
    .style("stroke-dasharray", ("3, 3"))
    .attr("stroke", "red");

    course_svg.append("line")
    .attr("x1",scaled_today+margin.left)
    .attr("x2",scaled_today+margin.left)
    .attr("y1",0)
    .attr("y2",viz_heights.course+6*rect_margin)
    .attr("stroke-width",2)
    .style("stroke-dasharray", ("3, 3"))
    .attr("stroke", "red");
}
// Get the data
d3.csv("kaggle_data.csv",draw_linechart)
d3.csv("course_data.csv",draw_courses)